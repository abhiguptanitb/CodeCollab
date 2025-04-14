import { WebContainer } from '@webcontainer/api';

let webContainerInstance = null;


export const getWebContainer = async () => {
    if (webContainerInstance === null) {
        console.log("Creating new WebContainer instance...");
        webContainerInstance = await WebContainer.boot();
        console.log("WebContainer instance created");
    }
    console.log("WebContainer instance created:");
    return webContainerInstance;
}