import { WebContainer } from '@webcontainer/api';

let webContainerInstance = null;


export const getWebContainer = async () => {
    if (webContainerInstance === null) {
        console.log("Creating new WebContainer instance...");
        try {
            webContainerInstance = await WebContainer.boot();
            console.log("WebContainer instance created");
        } catch (error) {
            console.error("Failed to boot WebContainer:", error);
        }
    }
    console.log("Returning WebContainer instance");
    return webContainerInstance;
};
