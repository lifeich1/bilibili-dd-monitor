'use strict'

import { app, protocol, BrowserWindow, ipcMain } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import path from 'path'
import settings from 'electron-settings'

import { FollowListService, SettingService, VtbInfoService } from '@/electron/services'
import { PlayerObj, VtbInfo } from '@/interfaces'
import { createPlayerWindow } from '@/electron/playerWindow'

let vtbInfosService: VtbInfoService
let mainWindow: BrowserWindow
const playerObjMap = new Map<number, PlayerObj>()
const isDevelopment = process.env.NODE_ENV !== 'production'

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: (process.env
        .ELECTRON_NODE_INTEGRATION as unknown) as boolean,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await mainWindow.loadURL(process.env.WEBPACK_DEV_SERVER_URL as string)
    // await win.loadURL('https://www.bilibili.com/blackboard/live/live-activity-player.html?enterTheRoom=0&cid=21396545')

    if (!process.env.IS_TEST) mainWindow.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    await mainWindow.loadURL('app://./index.html')
  }

  return mainWindow
}

const initUpdate = () => {
  // noop
}

const initSettingsConfiguration = () => {
  settings.configure({
    numSpaces: 2,
    prettify: true
  })
}

const initServices = () => {
  vtbInfosService = new VtbInfoService()
  mainWindow.on('close', () => {
    // clean up vtbInfo update
    vtbInfosService.stopUpdate()
  })

  FollowListService.initFollowListsSync()
}

const initIpcMainListeners = () => {
  // region VtbInfo
  ipcMain.on('getVtbInfos', (event: Electron.IpcMainEvent) => {
    event.reply('getVtbInfosReply', vtbInfosService.getVtbInfosMock())
  })
  ipcMain.on('getFollowedVtbInfos', (event: Electron.IpcMainEvent) => {
    event.reply('getFollowedVtbInfosReply', vtbInfosService.getFollowedVtbInfosMock())
  })
  // endregion

  // region notification
  ipcMain.on('setIsNotifiedOnStart', (event: Electron.IpcMainEvent, isNotifiedOnStart: boolean) => {
    event.reply('setIsNotifiedOnStartReply', SettingService.setIsNotifiedOnStartSync(isNotifiedOnStart))
  })
  ipcMain.on('getIsNotifiedOnStart', (event: Electron.IpcMainEvent) => {
    event.reply('getIsNotifiedOnStartReply', SettingService.getIsNotifiedOnStartSync())
  })
  // endregion

  // region follow
  ipcMain.on('getFollowedVtbMids', (event: Electron.IpcMainEvent) => {
    event.reply('getFollowedVtbMidsReply', FollowListService.getFollowedVtbMidsSync())
  })
  ipcMain.on('getFollowLists', (event: Electron.IpcMainEvent) => {
    event.reply('getFollowListsReply', FollowListService.getFollowListsSync())
  })
  ipcMain.on('addFollowList', (event: Electron.IpcMainEvent, name: string) => {
    FollowListService.addFollowListSync(name)
    event.reply('addFollowListReply', FollowListService.getFollowListsSync())
  })
  ipcMain.on('deleteFollowList', (event: Electron.IpcMainEvent, id: number) => {
    FollowListService.deleteFollowListSync(id)
    event.reply('deleteFollowListReply', FollowListService.getFollowListsSync())
  })
  ipcMain.on('renameFollowList', (event: Electron.IpcMainEvent, id: number, newName: string) => {
    FollowListService.renameFollowListSync(id, newName)
    event.reply('renameFollowListReply', FollowListService.getFollowListsSync())
  })
  ipcMain.on('toggleFollow', (event: Electron.IpcMainEvent, mid: number) => {
    FollowListService.toggleFollowSync(mid)
    event.reply('toggleFollowReply', FollowListService.getFollowedVtbMidsSync())
  })
  ipcMain.on('setFollowList', (event: Electron.IpcMainEvent, mids: number[], listId: number) => {
    FollowListService.addMidsToFollowListSync(mids, listId)
    event.reply('setFollowListReply', FollowListService.getFollowListsSync())
  })
  // endregion

  // region player
  ipcMain.on('showPlayer', (event: Electron.IpcMainEvent, roomid: number) => {
    if (playerObjMap.has(roomid)) {
      playerObjMap.get(roomid)!.playerWindow.focus()
    } else {
      const vtbInfo: VtbInfo = vtbInfosService.getVtbInfosMock().find((vtbInfo: VtbInfo) => {
        return vtbInfo.roomid === roomid
      })!
      playerObjMap.set(roomid, createPlayerWindow(app, vtbInfo, playerObjMap))
    }
  })
  // endregion
}

const initApp = () => {
  initUpdate()
  initSettingsConfiguration()
  initServices()
  // todo 上播提醒
  initIpcMainListeners()
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', async () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = await createWindow()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (isDevelopment && !process.env.IS_TEST) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e.toString())
    }
  }
  mainWindow = await createWindow()
  initApp()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}