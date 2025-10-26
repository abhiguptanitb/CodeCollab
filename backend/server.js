import 'dotenv/config';
import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './models/project.model.js';
import { generateResult } from './services/ai.service.js';

const port = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: '*'
    }
});

io.use(async (socket, next) => {

    try {

        const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.split(' ')[ 1 ];
        const projectId = socket.handshake.query.projectId;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return next(new Error('Invalid projectId'));
        }


        socket.project = await projectModel.findById(projectId);


        if (!token) {
            return next(new Error('Authentication error'))
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (!decoded) {
            return next(new Error('Authentication error'))
        }

        socket.user = decoded;

        next();

    } catch (error) {
        next(error)
    }

})


io.on('connection', socket => {
    socket.roomId = socket.project._id.toString()

    console.log('a user connected');

    socket.join(socket.roomId);

    socket.on('project-message', async data => {

        const message = data.message;

        const aiIsPresentInMessage = message.includes('@ai');
        socket.broadcast.to(socket.roomId).emit('project-message', data)

        if (aiIsPresentInMessage) {

            const prompt = message.replace('@ai', '');

            const result = await generateResult(prompt);

            try {
                console.log("Raw AI result:", result);
                
                // Clean the response - remove any extra text or escape characters
                let cleanResult = result.trim();
                
                // Try to extract JSON from the response if it's wrapped in other text
                const jsonMatch = cleanResult.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    cleanResult = jsonMatch[0];
                }
                
                // Try to parse the AI response as JSON
                const aiResponse = JSON.parse(cleanResult);
                console.log("Parsed AI response:", aiResponse);
                
                // If the response contains a fileTree, update the project
                if (aiResponse.fileTree) {
                    console.log("FileTree found, updating project...");
                    const project = await projectModel.findById(socket.project._id);
                    if (project) {
                        project.fileTree = aiResponse.fileTree;
                        await project.save();
                        
                        // Emit the updated file tree to all clients
                        io.to(socket.roomId).emit('file-tree-updated', {
                            fileTree: aiResponse.fileTree
                        });
                    }
                }

                // Send the AI response (either text or parsed JSON)
                io.to(socket.roomId).emit('project-message', {
                    message: aiResponse.text || cleanResult,
                    sender: {
                        _id: 'ai',
                        email: 'AI'
                    },
                    timestamp: new Date().toISOString()
                });

            } catch (parseError) {
                // If parsing fails, send the raw response
                console.log('AI response is not valid JSON, sending as text:', parseError.message);
                console.log('Raw result that failed to parse:', result);
                io.to(socket.roomId).emit('project-message', {
                    message: result,
                    sender: {
                        _id: 'ai',
                        email: 'AI'
                    },
                    timestamp: new Date().toISOString()
                });
            }

            return
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