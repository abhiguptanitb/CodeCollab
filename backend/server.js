import 'dotenv/config';
import http from 'http';
import app from './app.js';
import connect from './db/db.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js';
import userModel from './models/user.model.js';
import { generateResult } from './services/ai.service.js';
import * as messageService from './services/message.service.js';
import * as projectService from './services/project.service.js';

const port = process.env.PORT || 3000;
const corsOrigin = process.env.CLIENT_URL || '*';

connect();

const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: corsOrigin,
        credentials: corsOrigin !== '*'
    }
});

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
            return next(new Error("Authentication error"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded) {
            return next(new Error("Authentication error"));
        }

        const user = await userModel.findOne({ email: decoded.email });
        if (!user) {
            return next(new Error("Authentication error"));
        }

        socket.user = user;

        const projectId = socket.handshake.query.projectId;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error("Invalid projectId"));
        }

        socket.project = await projectModel.findOne({ _id: projectId, users: user._id });
        if (!socket.project) {
            return next(new Error("Project access denied"));
        }

        next();

    } catch (error) {
        next(error);
    }
});


io.on('connection', socket => {
    socket.roomId = socket.project._id.toString()

    console.log('a user connected');

    socket.join(socket.roomId);

    socket.on('project-message', async data => {
        try {
            const message = data.message?.trim();

            if (!message) {
                return;
            }

            const savedUserMessage = await messageService.createUserMessage({
                projectId: socket.roomId,
                senderId: socket.user._id,
                message
            });

            io.to(socket.roomId).emit('project-message', savedUserMessage);

            const aiIsPresentInMessage = message.includes('@ai');

            if (aiIsPresentInMessage) {

                const prompt = message.replace('@ai', '');

                const result = await generateResult(prompt);

                try {
                    console.log("Raw AI result:", result);
                
                    let cleanResult = result.trim();
                
                    const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        cleanResult = jsonMatch[0];
                    }
                
                    const aiResponse = JSON.parse(cleanResult);
                    console.log("Parsed AI response:", aiResponse);
                
                    if (aiResponse.fileTree) {
                        console.log("FileTree found, updating project...");
                        const project = await projectService.updateFileTree({
                            projectId: socket.roomId,
                            fileTree: aiResponse.fileTree,
                            userId: socket.user._id
                        });
                        
                        io.to(socket.roomId).emit('file-tree-updated', {
                            fileTree: project.fileTree
                        });
                    }

                    const savedAiMessage = await messageService.createAiMessage({
                        projectId: socket.roomId,
                        message: aiResponse.text || cleanResult
                    });

                    io.to(socket.roomId).emit('project-message', savedAiMessage);

                } catch (parseError) {
                    console.log('AI response is not valid JSON, sending as text:', parseError.message);
                    console.log('Raw result that failed to parse:', result);
                    const savedAiMessage = await messageService.createAiMessage({
                        projectId: socket.roomId,
                        message: result
                    });
                    io.to(socket.roomId).emit('project-message', savedAiMessage);
                }

                return
            }
        } catch (error) {
            console.error('Error handling project message:', error);
            socket.emit('project-error', { message: error.message });
        }
    })

    socket.on('file-tree-save', async data => {
        try {
            if (!data?.fileTree || typeof data.fileTree !== 'object') {
                return socket.emit('project-error', { message: 'Invalid file tree' });
            }

            const project = await projectService.updateFileTree({
                projectId: socket.roomId,
                fileTree: data.fileTree,
                userId: socket.user._id
            });

            socket.broadcast.to(socket.roomId).emit('file-tree-updated', {
                fileTree: project.fileTree
            });
        } catch (error) {
            console.error('Error saving file tree:', error);
            socket.emit('project-error', { message: error.message });
        }
    })

    socket.on('disconnect', () => {
        console.log('user disconnected');
        socket.leave(socket.roomId)
    });
});

server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
})
