import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.GOOGLE_AI_KEY = 'test-key';

let mongoServer;
let app;

const register = async (email) => {
    const response = await request(app)
        .post('/users/register')
        .send({ email, password: 'secret123' })
        .expect(201);

    return response.body;
};

test.before(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = mongoServer.getUri();

    app = (await import('../app.js')).default;
    await mongoose.connect(process.env.MONGODB_URI);
});

test.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

test.beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
});

test('project owner can add collaborators while collaborators cannot manage ownership actions', async () => {
    const owner = await register('owner@example.com');
    const collaborator = await register('collab@example.com');
    const secondCollaborator = await register('second@example.com');

    const createResponse = await request(app)
        .post('/projects/create')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ name: 'Resume Project' })
        .expect(201);

    const projectId = createResponse.body._id;

    const addResponse = await request(app)
        .put('/projects/add-user')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ projectId, users: [ collaborator.user._id ] })
        .expect(200);

    assert.equal(addResponse.body.project.users.length, 2);

    await request(app)
        .put('/projects/add-user')
        .set('Authorization', `Bearer ${collaborator.token}`)
        .send({ projectId, users: [ secondCollaborator.user._id ] })
        .expect(400)
        .expect((response) => {
            assert.equal(response.body.error, 'Only project owner can perform this action');
        });

    await request(app)
        .delete(`/projects/delete/${projectId}`)
        .set('Authorization', `Bearer ${collaborator.token}`)
        .expect(400)
        .expect((response) => {
            assert.equal(response.body.error, 'Only project owner can perform this action');
        });
});

test('project list marks owned and collaborated projects with correct roles', async () => {
    const owner = await register('owner@example.com');
    const collaborator = await register('collab@example.com');

    const ownerProjectResponse = await request(app)
        .post('/projects/create')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ name: 'Owner Project' })
        .expect(201);

    await request(app)
        .post('/projects/create')
        .set('Authorization', `Bearer ${collaborator.token}`)
        .send({ name: 'Collaborator Project' })
        .expect(201);

    await request(app)
        .put('/projects/add-user')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ projectId: ownerProjectResponse.body._id, users: [ collaborator.user._id ] })
        .expect(200);

    await request(app)
        .get('/projects/all')
        .set('Authorization', `Bearer ${collaborator.token}`)
        .expect(200)
        .expect((response) => {
            const projectsByName = new Map(response.body.projects.map((project) => [ project.name, project ]));

            assert.equal(projectsByName.get('Owner Project').role, 'collaborator');
            assert.equal(projectsByName.get('Owner Project').collaboratorCount, 1);
            assert.equal(projectsByName.get('Collaborator Project').role, 'owner');
            assert.equal(projectsByName.get('Collaborator Project').collaboratorCount, 0);
        });
});

test('project owner can remove collaborators and removed users lose project access', async () => {
    const owner = await register('owner@example.com');
    const collaborator = await register('collab@example.com');
    const secondCollaborator = await register('second@example.com');

    const createResponse = await request(app)
        .post('/projects/create')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ name: 'Removable Workspace' })
        .expect(201);

    const projectId = createResponse.body._id;

    await request(app)
        .put('/projects/add-user')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ projectId, users: [ collaborator.user._id, secondCollaborator.user._id ] })
        .expect(200);

    await request(app)
        .put('/projects/remove-user')
        .set('Authorization', `Bearer ${collaborator.token}`)
        .send({ projectId, collaboratorId: secondCollaborator.user._id })
        .expect(400)
        .expect((response) => {
            assert.equal(response.body.error, 'Only project owner can perform this action');
        });

    await request(app)
        .put('/projects/remove-user')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ projectId, collaboratorId: owner.user._id })
        .expect(400)
        .expect((response) => {
            assert.equal(response.body.error, 'Project owner cannot be removed');
        });

    await request(app)
        .put('/projects/remove-user')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ projectId, collaboratorId: collaborator.user._id })
        .expect(200)
        .expect((response) => {
            const userIds = response.body.project.users.map((projectUser) => projectUser._id);
            assert.equal(userIds.includes(owner.user._id), true);
            assert.equal(userIds.includes(secondCollaborator.user._id), true);
            assert.equal(userIds.includes(collaborator.user._id), false);
        });

    await request(app)
        .get(`/projects/get-project/${projectId}`)
        .set('Authorization', `Bearer ${collaborator.token}`)
        .expect(400)
        .expect((response) => {
            assert.equal(response.body.error, 'User not belong to this project');
        });
});

test('collaborators can open projects and update files, outsiders cannot', async () => {
    const owner = await register('owner@example.com');
    const collaborator = await register('collab@example.com');
    const outsider = await register('outsider@example.com');

    const createResponse = await request(app)
        .post('/projects/create')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ name: 'Workspace' })
        .expect(201);

    const projectId = createResponse.body._id;

    await request(app)
        .put('/projects/add-user')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ projectId, users: [ collaborator.user._id ] })
        .expect(200);

    await request(app)
        .get(`/projects/get-project/${projectId}`)
        .set('Authorization', `Bearer ${collaborator.token}`)
        .expect(200);

    await request(app)
        .put('/projects/update-file-tree')
        .set('Authorization', `Bearer ${collaborator.token}`)
        .send({
            projectId,
            fileTree: {
                'app.js': {
                    file: {
                        contents: 'console.log("hello")'
                    }
                }
            }
        })
        .expect(200)
        .expect((response) => {
            assert.equal(response.body.project.fileTree['app.js'].file.contents, 'console.log("hello")');
        });

    await request(app)
        .get(`/projects/get-project/${projectId}`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .expect(400)
        .expect((response) => {
            assert.equal(response.body.error, 'User not belong to this project');
        });
});
