import React, { useContext, useState, useEffect } from 'react';
import { UserContext } from '../context/user.context';
import axios from "../config/axios";
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/logo.svg';

const Home = () => {
    const { user, setUser, logout } = useContext(UserContext);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectName, setProjectName] = useState('');
    const [project, setProject] = useState([]);

    const navigate = useNavigate();

    const createProject = (e) => {
        e.preventDefault();
        console.log({ projectName });

        axios.post('/projects/create', {
            name: projectName,
        })
            .then((res) => {
                console.log(res);
                setIsModalOpen(false);
                setProjectName(''); // Clear the input field
                fetchProjects(); // Fetch projects again after creating a new project
            })
            .catch((error) => {
                console.log(error);
            });
    };

    const fetchProjects = () => {
        axios.get('/projects/all').then((res) => {
            setProject(res.data.projects);
        }).catch(err => {
            console.log(err);
        });
    };

    const deleteProject = (projectId) => {
        axios.delete(`/projects/delete/${projectId}`).then((res) => {
            console.log(res.data);
            fetchProjects(); // Fetch projects again after deleting a project
        }).catch(err => {
            console.log(err);
        });
    };

    useEffect(() => {
        if (user) {
            fetchProjects();
        }
    }, [user]);

    const handleLogout = async () => {
        try {
            await axios.get('/users/logout');
            localStorage.removeItem('token');
            logout(); // This will clear chat data and set user to null
            navigate('/login');
        } catch (error) {
            console.log(error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
            {/* Header */}
            <header className="bg-gradient-to-r from-slate-800/80 to-blue-800/80 backdrop-blur-sm border-b border-cyan-500/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-3">
                            <img src={Logo} alt="CodeCollab" className="w-8 h-8" />
                            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">CodeCollab</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                                    <span className="text-white text-sm font-medium">
                                        {user?.email?.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <span className="text-slate-300 text-sm">{user?.email}</span>
                            </div>
                <button
                    onClick={handleLogout}
                                className="px-4 py-2 text-slate-300 hover:text-white hover:bg-gradient-to-r hover:from-red-600 hover:to-pink-600 rounded-lg transition-all duration-200 shadow-lg hover:shadow-red-500/25"
                >
                                <i className="ri-logout-box-line mr-2"></i>
                    Logout
                </button>
            </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Welcome Section */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">Welcome back!</h2>
                    <p className="text-slate-400">Manage your coding projects and collaborate with your team.</p>
                </div>

                {/* Action Bar */}
                <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center space-x-4">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-cyan-500/25 hover:shadow-xl"
                        >
                            <i className="ri-add-line text-lg"></i>
                            <span className="font-medium">New Project</span>
                        </button>
                    </div>
                    <div className="text-slate-400">
                        {project.length} {project.length === 1 ? 'project' : 'projects'}
                    </div>
                </div>

                {/* Projects Grid */}
                {project.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 bg-slate-700 rounded-full flex items-center justify-center">
                            <i className="ri-folder-open-line text-3xl text-slate-400"></i>
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
                        <p className="text-slate-400 mb-6">Create your first project to start collaborating</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-cyan-500/25"
                        >
                            Create Project
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {project.map((project) => (
                            <div
                                key={project._id}
                                onClick={() => navigate(`/project/${project._id}`, { state: { project } })}
                                className="group bg-gradient-to-br from-slate-800/60 to-blue-900/40 backdrop-blur-sm border border-cyan-500/20 rounded-xl p-6 cursor-pointer hover:from-slate-800/80 hover:to-blue-900/60 hover:border-cyan-400/40 transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/20"
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center">
                                        <i className="ri-folder-line text-white text-xl"></i>
                                    </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        deleteProject(project._id);
                                    }}
                                        className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                                >
                                    <i className="ri-delete-bin-6-line"></i>
                                </button>
                            </div>
                                <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-blue-400 transition-colors">
                                    {project.name}
                                </h3>
                                <div className="flex items-center space-x-2 text-slate-400 mb-2">
                                    <i className="ri-user-line"></i>
                                    <span className="text-sm">{project.users.length} collaborator{project.users.length !== 1 ? 's' : ''}</span>
                                </div>
                                {project.createdBy && (
                                    <div className="flex items-center space-x-2 text-slate-500">
                                        <i className="ri-user-star-line"></i>
                                        <span className="text-xs">
                                            Created by {project.createdBy.email || 'You'}
                                        </span>
                                    </div>
                                )}
                                <div className="mt-4 pt-4 border-t border-slate-700">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-slate-500">Last updated</span>
                                        <span className="text-xs text-slate-500">Just now</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                )}
            </main>

            {/* Create Project Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-semibold text-white">Create New Project</h2>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    <i className="ri-close-line"></i>
                                </button>
                            </div>
                        <form onSubmit={createProject}>
                                <div className="mb-6">
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Project Name
                                    </label>
                                <input
                                    onChange={(e) => setProjectName(e.target.value)}
                                    value={projectName}
                                        type="text"
                                        className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                        placeholder="Enter project name"
                                        required
                                    />
                            </div>
                                <div className="flex space-x-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                                    >
                                        Create Project
                                    </button>
                            </div>
                        </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;