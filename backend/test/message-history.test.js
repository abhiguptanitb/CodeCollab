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
let messageService;

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
    messageService = await import('../services/message.service.js');
    await mongoose.connect(process.env.MONGODB_URI);
});

test.after(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
});

test.beforeEach(async () => {
    await mongoose.connection.db.dropDatabase();
});

test('project chat history is persisted and scoped to collaborators', async () => {
    const owner = await register('owner@example.com');
    const outsider = await register('outsider@example.com');

    const createResponse = await request(app)
        .post('/projects/create')
        .set('Authorization', `Bearer ${owner.token}`)
        .send({ name: 'Chat Project' })
        .expect(201);

    const projectId = createResponse.body._id;

    await messageService.createUserMessage({
        projectId,
        senderId: owner.user._id,
        message: 'First team note'
    });

    await messageService.createAiMessage({
        projectId,
        message: 'AI response'
    });

    await request(app)
        .get(`/messages/project/${projectId}`)
        .set('Authorization', `Bearer ${owner.token}`)
        .expect(200)
        .expect((response) => {
            assert.equal(response.body.messages.length, 2);
            assert.equal(response.body.messages[0].message, 'First team note');
            assert.equal(response.body.messages[1].sender.email, 'AI');
        });

    await request(app)
        .get(`/messages/project/${projectId}`)
        .set('Authorization', `Bearer ${outsider.token}`)
        .expect(400)
        .expect((response) => {
            assert.equal(response.body.error, 'User not belong to this project');
        });
});
