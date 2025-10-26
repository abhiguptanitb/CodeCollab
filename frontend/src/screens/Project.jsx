import React, { useState, useEffect, useContext, useRef } from 'react'
import { UserContext } from '../context/user.context'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import axios from '../config/axios'
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket'
import Markdown from 'markdown-to-jsx'
import hljs from 'highlight.js';
import { getWebContainer } from '../config/webContainer'
import Logo from '../assets/logo.svg'


function SyntaxHighlightedCode(props) {
    const ref = useRef(null)

    React.useEffect(() => {
        if (ref.current && props.className?.includes('lang-') && window.hljs) {
            window.hljs.highlightElement(ref.current)

            // hljs won't reprocess the element unless this attribute is removed
            ref.current.removeAttribute('data-highlighted')
        }
    }, [ props.className, props.children ])

    return <code {...props} ref={ref} />
}


const Project = () => {

    const location = useLocation()
    const navigate = useNavigate()
    const { projectId: urlProjectId } = useParams()

    const [ isSidePanelOpen, setIsSidePanelOpen ] = useState(false)
    const [ isModalOpen, setIsModalOpen ] = useState(false)
    const [ selectedUserId, setSelectedUserId ] = useState(new Set()) // Initialized as Set
    const [ project, setProject ] = useState(location.state?.project || null)
    const [ message, setMessage ] = useState('')
    const [ isLoading, setIsLoading ] = useState(true)
    const [ error, setError ] = useState(null)
    const { user } = useContext(UserContext)
    const messageBox = React.createRef()

    const [ users, setUsers ] = useState([])
    const [ messages, setMessages ] = useState([]) // New state variable for messages
    const [ fileTree, setFileTree ] = useState({})

    const [ currentFile, setCurrentFile ] = useState(null)
    const [ openFiles, setOpenFiles ] = useState([])

    const [ webContainer, setWebContainer ] = useState(null)
    const webContainerRef = useRef(null);
    const [ iframeUrl, setIframeUrl ] = useState(null)

    const [ runProcess, setRunProcess ] = useState(null)

    const [selectedFile, setSelectedFile] = useState(null);
    
    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messageBox.current) {
            messageBox.current.scrollTop = messageBox.current.scrollHeight;
        }
    }, [messages]);

    const handleUserClick = (id) => {
        setSelectedUserId(prevSelectedUserId => {
            const newSelectedUserId = new Set(prevSelectedUserId);
            if (newSelectedUserId.has(id)) {
                newSelectedUserId.delete(id);
            } else {
                newSelectedUserId.add(id);
            }

            return newSelectedUserId;
        });
    }


    function addCollaborators() {

        axios.put("/projects/add-user", {
            projectId: location.state.project._id,
            users: Array.from(selectedUserId)
        }).then(res => {
            console.log(res.data)
            setIsModalOpen(false)

        }).catch(err => {
            console.log(err)
        })
    }

    // Function to save messages to localStorage
    const saveMessagesToStorage = (projectId, messages) => {
        const chatKey = `chat_${projectId}_${user._id}`
        localStorage.setItem(chatKey, JSON.stringify(messages))
    }

    // Function to load messages from localStorage
    const loadMessagesFromStorage = (projectId) => {
        const chatKey = `chat_${projectId}_${user._id}`
        const savedMessages = localStorage.getItem(chatKey)
        return savedMessages ? JSON.parse(savedMessages) : []
    }

    // Function to clear messages from localStorage
    const clearMessagesFromStorage = (projectId) => {
        const chatKey = `chat_${projectId}_${user._id}`
        localStorage.removeItem(chatKey)
        setMessages([]) // Also clear from state
    }

    // Function to clear current project's messages
    const clearCurrentProjectMessages = () => {
        const projectId = project?._id || location.state?.project?._id || urlProjectId
        if (projectId) {
            clearMessagesFromStorage(projectId)
        }
    }

    const send = () => {
        if (!message.trim()) return; // Don't send empty messages
        
        const newMessage = { 
            sender: user, 
            message: message.trim(),
            timestamp: new Date().toISOString()
        }
        
        sendMessage('project-message', {
            message: message.trim(),
            sender: user,
            timestamp: new Date().toISOString()
        })
        
        // Update messages state and save to localStorage
        setMessages(prevMessages => {
            const updatedMessages = [...prevMessages, newMessage]
            
            // Save to localStorage
            const projectId = project?._id || location.state?.project?._id || urlProjectId
            if (projectId) {
                saveMessagesToStorage(projectId, updatedMessages)
            }
            
            return updatedMessages
        })
        
        setMessage("")
    }

    function WriteAiMessage(message) {
        let messageObject;
        
        // Try to parse as JSON, if it fails, treat as plain text
        try {
            messageObject = JSON.parse(message);
        } catch (error) {
            // If parsing fails, treat the message as plain text
            messageObject = { text: message };
        }

        return (
            <div
                className='overflow-auto bg-slate-950 text-white rounded-sm p-2'
            >
                <Markdown
                    children={messageObject.text}
                    options={{
                        overrides: {
                            code: SyntaxHighlightedCode,
                        },
                    }}
                />
            </div>)
    }

    useEffect(() => {
        // Check if we have project data from navigation state or URL
        if (!project && !location.state?.project && !urlProjectId) {
            setError("No project selected. Please go back and select a project.");
            setIsLoading(false);
            return;
        }

        // If we have project from state, use it; otherwise use URL param or fetch it
        const projectId = project?._id || location.state?.project?._id || urlProjectId;
        
        if (!projectId) {
            setError("Invalid project. Please go back and select a project.");
            setIsLoading(false);
            return;
        }

        // Initialize socket and web container
        const socket = initializeSocket(projectId);

        if (!webContainerRef.current) {
            getWebContainer()
                .then((container) => {
                    webContainerRef.current = container;
                    setWebContainer(container);
                    console.log("WebContainer initialized");
                })
                .catch((err) => {
                    console.error("Error initializing WebContainer:", err);
                });
        }
        
        // Set up message handling after socket is initialized
        if (socket) {
            receiveMessage("project-message", (data) => {
                console.log("Received message:", data);
                setMessages(prevMessages => {
                    const updatedMessages = [...prevMessages, data];
                    
                    // Save to localStorage
                    const projectId = project?._id || location.state?.project?._id || urlProjectId
                    if (projectId) {
                        saveMessagesToStorage(projectId, updatedMessages);
                    }
                    
                    return updatedMessages;
                });
            });
        }

        // Listen for file tree updates
        if (socket) {
            receiveMessage("file-tree-updated", (data) => {
                console.log("File tree updated event received:", data);
                console.log("Setting file tree to:", data.fileTree);
                setFileTree(data.fileTree);
                
                // Also mount to web container if available
                if (webContainer && data.fileTree) {
                    webContainer.mount(data.fileTree).catch((err) => {
                        console.error("Error mounting fileTree:", err);
                    });
                }
            });
        }
    
        // Fetch project details
        axios
            .get(`/projects/get-project/${projectId}`)
            .then((res) => {
                console.log(res.data.project);
                setProject(res.data.project);
                setFileTree(res.data.project.fileTree || {});
                
                // Load saved messages from localStorage
                const savedMessages = loadMessagesFromStorage(projectId);
                setMessages(savedMessages);
                
                setIsLoading(false);
            })
            .catch((err) => {
                console.error("Error fetching project:", err);
                setError("Failed to load project. Please try again.");
                setIsLoading(false);
            });
    
        // Fetch users
        axios
            .get("/users/all")
            .then((res) => {
                setUsers(res.data.users);
            })
            .catch((err) => {
                console.error("Error fetching users:", err);
            });
    }, []);

    // Cleanup effect - clear messages when component unmounts
    useEffect(() => {
        return () => {
            // This will run when component unmounts
            // Messages will persist in localStorage until user logs out
        };
    }, []);

    function saveFileTree(ft) {
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft
        }).then(res => {
            console.log(res.data)
        }).catch(err => {
            console.log(err)
        })
    }

    // const runCode = async () => {
    //         if (!webContainer) {
    //             console.error("webContainer is not initialized");
    //             return;
    //         }
        
    //         if (!fileTree || Object.keys(fileTree).length === 0) {
    //             console.error("fileTree is empty or not available");
    //             return;
    //         }
        
    //         try {
    //             await webContainer.mount(fileTree);
            
    //             const installProcess = await webContainer.spawn("npm", ["install"]);
    //             installProcess.output.pipeTo(new WritableStream({
    //                 write(chunk) {
    //                 console.log(chunk);
    //                 }
    //             }));
            
    //             if (runProcess) {
    //                 runProcess.kill();
    //             }
            
    //             const tempRunProcess = await webContainer.spawn("npm", ["start"]);
    //             tempRunProcess.output.pipeTo(new WritableStream({
    //                 write(chunk) {
    //                 console.log(chunk);
    //                 }
    //             }));
            
    //             setRunProcess(tempRunProcess);
            
    //             webContainer.on('server-ready', (port, url) => {
    //                 console.log(port, url);
    //                 setIframeUrl(url);
    //             });
    //         } catch (err) {
    //             console.error("Error while running project:", err);
    //         }
    //     };
    const runCode = async () => {
        const container = webContainerRef.current;
        
        if (!container) {
            console.error("webContainer is not initialized");
            return;
        }
    
        if (!fileTree || Object.keys(fileTree).length === 0) {
            console.error("fileTree is empty or not available");
            return;
        }
    
        try {
            await container.mount(fileTree);
    
            const installProcess = await container.spawn("npm", ["install"]);
            let installOutput = "";
            installProcess.output.pipeTo(new WritableStream({
                write(chunk) {
                    installOutput += chunk;
                    // Only log when install is complete or on significant progress
                    if (chunk.includes("added") || chunk.includes("packages") || chunk.includes("audited")) {
                        console.log("📦 Installing packages...");
                    }
                }
            }));
            
            // Wait for install to complete and show summary
            installProcess.exit.then(() => {
                console.log("✅ Installation completed");
            });
    
            if (runProcess) {
                runProcess.kill();
            }
    
            const tempRunProcess = await container.spawn("npm", ["start"]);
            tempRunProcess.output.pipeTo(new WritableStream({
                write(chunk) {
                    // Only log important server messages, not every chunk
                    if (chunk.includes("Server running") || chunk.includes("listening") || chunk.includes("started")) {
                        console.log("🚀 Server started successfully");
                    }
                }
            }));
    
            setRunProcess(tempRunProcess);
    
            container.on('server-ready', (port, url) => {
                console.log(`🌐 Server ready at: ${url}`);
                setIframeUrl(url);
            });
        } catch (err) {
            console.error("Error while running project:", err);
        }
    };
    

    // Loading state
    if (isLoading) {
        return (
            <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-300">Loading project...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-error-warning-line text-red-400 text-2xl"></i>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Error</h2>
                    <p className="text-slate-300 mb-6">{error}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    // No project state
    if (!project) {
        return (
            <div className="h-screen w-screen bg-slate-900 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i className="ri-folder-open-line text-slate-400 text-2xl"></i>
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">No Project Selected</h2>
                    <p className="text-slate-300 mb-6">Please go back and select a project to continue.</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        Back to Projects
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex flex-col">
            {/* Top Navigation */}
            <header className="bg-gradient-to-r from-slate-800/90 to-blue-800/90 border-b border-cyan-500/30 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors"
                    >
                        <i className="ri-arrow-left-line"></i>
                        <span>Back to Projects</span>
                    </button>
                    <div className="h-6 w-px bg-slate-600"></div>
                    <div className="flex items-center space-x-3">
                        <img src={Logo} alt="CodeCollab" className="w-6 h-6" />
                        <h1 className="text-lg font-semibold text-white">{project.name}</h1>
                    </div>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                        <i className="ri-user-add-line"></i>
                        <span>Add Collaborator</span>
                    </button>
                    <button
                        onClick={() => setIsSidePanelOpen(!isSidePanelOpen)}
                        className="p-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <i className="ri-group-line"></i>
                    </button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Chat Panel */}
                <section className="w-96 bg-slate-800 border-r border-slate-700 flex flex-col">
                    <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Chat</h2>
                        <button
                            onClick={clearCurrentProjectMessages}
                            className="text-xs text-slate-400 hover:text-red-400 transition-colors"
                            title="Clear chat history"
                        >
                            <i className="ri-delete-bin-line"></i>
                        </button>
                    </div>
                    
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div
                            ref={messageBox}
                            className="flex-1 p-4 space-y-3 overflow-y-auto"
                        >
                            {messages.map((msg, index) => {
                                const isCurrentUser = msg.sender._id === user._id;
                                const isAI = msg.sender._id === 'ai';
                                
                                // Debug logging
                                console.log('Message debug:', {
                                    msgSenderId: msg.sender._id,
                                    currentUserId: user._id,
                                    isCurrentUser,
                                    isAI,
                                    msgSenderEmail: msg.sender.email,
                                    currentUserEmail: user.email
                                });
                                
                                return (
                                    <div
                                        key={index}
                                        className={`flex flex-col ${
                                            isCurrentUser ? 'items-end' : 'items-start'
                                        }`}
                                    >
                                        <div className={`max-w-xs p-3 rounded-lg ${
                                            isCurrentUser
                                                ? 'bg-blue-600 text-white'
                                                : isAI
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-slate-700 text-slate-200'
                                        }`}>
                                        <div className="text-xs text-slate-400 mb-1">
                                            {msg.sender.email}
                                            {msg.timestamp && (
                                                <span className="ml-2">
                                                    {new Date(msg.timestamp).toLocaleTimeString()}
                                                </span>
                                            )}
                                        </div>
                                            <div className="text-sm">
                                                {isAI ? (
                                                    WriteAiMessage(msg.message)
                                                ) : (
                                                    <p>{msg.message}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-4 border-t border-slate-700">
                            <div className="flex space-x-2">
                                <input
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    type="text"
                                    placeholder="Type a message..."
                                    onKeyPress={(e) => e.key === 'Enter' && send()}
                                />
                                <button
                                    onClick={send}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                >
                                    <i className="ri-send-plane-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Code Editor Area */}
                <section className="flex-1 flex flex-col bg-slate-900">
                    <div className="flex-1 flex">
                        {/* File Explorer */}
                        <div className="w-64 bg-slate-800 border-r border-slate-700">
                            <div className="p-4 border-b border-slate-700">
                                <h3 className="text-sm font-medium text-slate-300">Files</h3>
                            </div>
                            <div className="p-2">
                                {Object.keys(fileTree).map((file, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            setCurrentFile(file);
                                            setOpenFiles([...new Set([...openFiles, file])]);
                                            setSelectedFile(file);
                                        }}
                                        className={`w-full text-left p-2 rounded-lg transition-colors ${
                                            selectedFile === file
                                                ? 'bg-blue-600 text-white'
                                                : 'text-slate-300 hover:bg-slate-700'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <i className="ri-file-line"></i>
                                            <span className="text-sm">{file}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Code Editor */}
                        <div className="flex-1 flex flex-col">
                            {/* Tab Bar */}
                            <div className="bg-slate-800 border-b border-slate-700 flex items-center justify-between">
                                <div className="flex">
                                    {openFiles.map((file, index) => (
                                        <button
                                            key={index}
                                            onClick={() => {
                                                setCurrentFile(file);
                                                setSelectedFile(file);
                                            }}
                                            className={`px-4 py-2 text-sm border-r border-slate-700 transition-colors ${
                                                currentFile === file
                                                    ? 'bg-slate-900 text-white'
                                                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            <div className="flex items-center space-x-2">
                                                <i className="ri-file-line"></i>
                                                <span>{file}</span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="flex items-center space-x-2 p-2">
                                    <button
                                        onClick={runCode}
                                        className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-emerald-500/25 text-sm"
                                    >
                                        <i className="ri-play-line mr-1"></i>
                                        Run
                                    </button>
                                </div>
                            </div>

                            {/* Editor Content */}
                            <div className="flex-1 overflow-hidden">
                                {fileTree[currentFile] ? (
                                    <div className="h-full bg-slate-900">
                                        <pre className="h-full overflow-auto">
                                            <code
                                                className="hljs h-full outline-none block p-4 text-slate-200"
                                                contentEditable
                                                suppressContentEditableWarning
                                                onBlur={(e) => {
                                                    const updatedContent = e.target.innerText;
                                                    const ft = {
                                                        ...fileTree,
                                                        [currentFile]: {
                                                            file: {
                                                                contents: updatedContent
                                                            }
                                                        }
                                                    };
                                                    setFileTree(ft);
                                                    saveFileTree(ft);
                                                }}
                                                dangerouslySetInnerHTML={{
                                                    __html: hljs.highlight(
                                                        fileTree[currentFile].file.contents,
                                                        { language: 'javascript' }
                                                    ).value
                                                }}
                                                style={{
                                                    whiteSpace: 'pre-wrap',
                                                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                                                    fontSize: '14px',
                                                    lineHeight: '1.5'
                                                }}
                                            />
                                        </pre>
                                    </div>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">
                                        <div className="text-center">
                                            <i className="ri-file-line text-4xl mb-4"></i>
                                            <p>Select a file to start editing</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Preview Panel */}
                        {iframeUrl && webContainer && (
                            <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col">
                                <div className="p-4 border-b border-slate-700">
                                    <h3 className="text-sm font-medium text-slate-300">Preview</h3>
                                </div>
                                <div className="p-2 border-b border-slate-700">
                                    <input
                                        type="text"
                                        value={iframeUrl}
                                        onChange={(e) => setIframeUrl(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
                                    />
                                </div>
                                <div className="flex-1">
                                    <iframe
                                        src={iframeUrl}
                                        className="w-full h-full border-0"
                                        title="Preview"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </div>

            {/* Collaborators Side Panel */}
            <div className={`fixed inset-y-0 right-0 w-80 bg-slate-800 border-l border-slate-700 transform transition-transform z-50 ${
                isSidePanelOpen ? 'translate-x-0' : 'translate-x-full'
            }`}>
                <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">Collaborators</h2>
                    <button
                        onClick={() => setIsSidePanelOpen(false)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <i className="ri-close-line"></i>
                    </button>
                </div>
                <div className="p-4 space-y-3">
                    {project.users && project.users.map((user, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-slate-700 rounded-lg">
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-medium">
                                    {user.email.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div>
                                <p className="text-white font-medium">{user.email}</p>
                                <p className="text-slate-400 text-sm">Online</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Add Collaborator Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Add Collaborators</h2>
                                    <p className="text-sm text-slate-400 mt-1">
                                        {(() => {
                                            const availableCount = users.filter(user => {
                                                const isAlreadyCollaborator = project.users && 
                                                    project.users.some(projectUser => projectUser._id === user._id);
                                                return !isAlreadyCollaborator;
                                            }).length;
                                            return `${availableCount} user${availableCount !== 1 ? 's' : ''} available`;
                                        })()}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <i className="ri-close-line"></i>
                                </button>
                            </div>
                            <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                                {(() => {
                                    const availableUsers = users.filter(user => {
                                        // Filter out users who are already collaborators
                                        const isAlreadyCollaborator = project.users && 
                                            project.users.some(projectUser => projectUser._id === user._id);
                                        return !isAlreadyCollaborator;
                                    });
                                    
                                    if (availableUsers.length === 0) {
                                        return (
                                            <div className="text-center py-8">
                                                <i className="ri-user-check-line text-4xl text-slate-400 mb-3"></i>
                                                <p className="text-slate-400">All users are already collaborators</p>
                                            </div>
                                        );
                                    }
                                    
                                    return availableUsers.map((user) => (
                                        <div
                                            key={user._id}
                                            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                                Array.from(selectedUserId).includes(user._id)
                                                    ? 'bg-blue-600/20 border border-blue-500/30'
                                                    : 'bg-slate-700 hover:bg-slate-600'
                                            }`}
                                            onClick={() => handleUserClick(user._id)}
                                        >
                                            <div className="w-10 h-10 bg-slate-600 rounded-full flex items-center justify-center">
                                                <span className="text-white text-sm font-medium">
                                                    {user.email.charAt(0).toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-white font-medium">{user.email}</p>
                                            </div>
                                            {Array.from(selectedUserId).includes(user._id) && (
                                                <i className="ri-check-line text-blue-400"></i>
                                            )}
                                        </div>
                                    ));
                                })()}
                            </div>
                            <button
                                onClick={addCollaborators}
                                disabled={selectedUserId.size === 0}
                                className={`w-full py-3 font-medium rounded-lg transition-colors ${
                                    selectedUserId.size === 0
                                        ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                            >
                                Add Selected Users
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Project