import React, { createContext, useState, useContext } from 'react';

// Create the UserContext
export const UserContext = createContext();

// Create a provider component
export const UserProvider = ({ children }) => {
    const [ user, setUser ] = useState(null);

    // Function to clear chat data for current user only
    const clearUserChatData = (userId) => {
        if (!userId) return;
        
        // Get all localStorage keys
        const keys = Object.keys(localStorage);
        
        // Find and remove only chat keys for this specific user
        keys.forEach(key => {
            if (key.startsWith('chat_') && key.endsWith(`_${userId}`)) {
                localStorage.removeItem(key);
            }
        });
    };

    // Enhanced logout function
    const logout = () => {
        // Clear chat data for current user only
        if (user?._id) {
            clearUserChatData(user._id);
        }
        setUser(null);
    };

    return (
        <UserContext.Provider value={{ user, setUser, logout, clearUserChatData }}>
            {children}
        </UserContext.Provider>
    );
};

