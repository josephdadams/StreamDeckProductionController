/* 
 * Elgato Stream Deck Controller for use with Ross Dashboard as a protocol interface.
 * Copyright 2018 Joseph Adams, Fellowship Greenville
 */

'use strict';

const fs = require("fs");
const http = require("http");

const electron = require("electron");

var eNotify = null;

const app = electron.app;
const BrowserWindow = electron.BrowserWindow;
const Menu = electron.Menu;
const Tray = electron.Tray;

const path = require('path');
const url = require('url');

const StreamDeck = require('elgato-stream-deck');
var myStreamDeck = null;

const net = require('net');
const server = net.createServer();

const osc = require('osc');

const assetsDirectory = path.join(__dirname, 'fixtures');

// INITIAL SETUP //

var jsonButtonContent = {};
var currentButtonContent = {};
var parentButtonContent = {};
var currentButtonObj = {};

var jsonDeviceContent = {};

var streamDeck_listenPort = "";

// END INITIAL SETUP //

const Store = require('./store.js');

const store = new Store({
  // We'll call our data file 'user-preferences'
  configName: 'user-preferences',
  defaults: {
    tcpListener: true,
    tcpListenPort: 5600,
    notifications: true
  }
});
  
  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
let settingsWindow = null;
let editorWindow = null;
let virtualDeckWindow = null;
let helpWindow = null;

let tray = null;

const ipc = electron.ipcMain;
const dialog = electron.dialog;

var buttonContentFile = "";
var deviceContentFile = "";

var buttonContent = "";
var deviceContent = "";

function createEditorWindow()
{
    if (editorWindow === null)
    {
        editorWindow = new BrowserWindow({width: 1700, height: 650, show: true, frame: true});
        editorWindow.loadURL('file://' + path.join(__dirname, 'editor.html'));
       editorWindow.webContents.openDevTools();
        editorWindow.on('closed', () => { editorWindow = null; });
    }
    else
    {
        editorWindow.show();
    }
}

function createVirtualDeckWindow()
{
    if (virtualDeckWindow === null)
    {
        virtualDeckWindow = new BrowserWindow({width: 450, height: 320, show: true, frame: false});
        virtualDeckWindow.loadURL('file://' + path.join(__dirname, 'virtualdeck.html'));
        //virtualDeckWindow.webContents.openDevTools();
        virtualDeckWindow.on('closed', () => { virtualDeckWindow = null; });
    }
    else
    {
        virtualDeckWindow.show();
    }
}

function createHelpWindow()
{
    if (helpWindow === null)
    {
        helpWindow = new BrowserWindow({width: 800, height: 600, show: true, frame: false});
        helpWindow.loadURL('file://' + path.join(__dirname, 'help.html'));
        helpWindow.on('closed', () => { helpWindow = null; });
    }
    else
    {
        helpWindow.show();
    }
}

function sendNotification(message, notify)
{
    var shouldNotify = false;
    
    switch(notify)
    {
        case "on":
            shouldNotify = true;
            break;
        case "off":
            shouldNotify = false;
            break;
        default:
            shouldNotify = store.get('notifications');
            break;
    }
    if (shouldNotify)
    {
        // Send simple notification
        eNotify.notify({ title: 'Stream Deck Production Controller', text: message });  
        console.log(message);
    }
}

function setUpApp()
{
    // First we'll get our data
    buttonContentFile = store.get('buttonContentFile');
    deviceContentFile = store.get('deviceContentFile');

    if (buttonContentFile !== "")
    {
        loadButtonStructureFile(buttonContentFile);
    }

    if (deviceContentFile !== "")
    {
        loadDeviceStructureFile(deviceContentFile);
    }
}

function setUpNotifications()
{
    eNotify = require("electron-notify");
    
    // Change config options
    eNotify.setConfig({
        appIcon: path.join(assetsDirectory, 'icons/png/1024x1024.png'),
        displayTime: 6000
    });
}

function createSettingsWindow()
{
    if (settingsWindow === null)
    {
          settingsWindow = new BrowserWindow({ width: 600, height: 300, show: true, frame: false});

          settingsWindow.loadURL('file://' + path.join(__dirname, 'settings.html'));

          settingsWindow.on('closed', () => {
             settingsWindow = null; 
          });
    }
    else
    {
        settingsWindow.show();
    }
}

// When our app is ready, we'll create the tray menu and other items
  app.on('ready', () => {      
      
      tray = new Tray(path.join(assetsDirectory, 'icon@2x.png'));
  const contextMenu = Menu.buildFromTemplate([
    {label: 'Settings', type: 'normal', click: createSettingsWindow},
    //{label: 'Editor', type: 'normal', click: createEditorWindow},
    {label: 'Virtual Deck', type: 'normal', click: createVirtualDeckWindow},
    {label: 'Help', type: 'normal', click: createHelpWindow},
    {type:'separator'},
    {label: 'Quit', type: 'normal', click: quitApp}
  ]);
  tray.setToolTip('StreamDeckController');
  tray.setContextMenu(contextMenu);
  
   app.dock.hide();
   
   setUpApp();
   setUpNotifications();
  
    createVirtualDeckWindow();
    StreamDeck_TryToLoad();
    });
  
function quitApp()
{
    eNotify.closeAll();
    if (myStreamDeck !== null) // it is important to deregister the stream deck or the app won't close properly
    {
        myStreamDeck.clearAllKeys();
        myStreamDeck.device.removeAllListeners('data');
        myStreamDeck.device.close();
    }
    server.close();
    app.quit();
}

/**** IPC Callbacks ****/

ipc.on("LoadStore-ButtonStructureFile", function (event) {
   event.sender.send("FileSelected-ButtonStructure", buttonContentFile); 
});

ipc.on("LoadStore-DeviceStructureFile", function (event) {
   event.sender.send("FileSelected-DeviceStructure", deviceContentFile); 
});

ipc.on("LoadStore-TCPListener", function (event) {
   event.sender.send("TCPListener-Status", store.get('tcpListener')); 
});

ipc.on("LoadStore-TCPListenPort", function (event) {
   event.sender.send("TCPListenPort-Status", store.get('tcpListenPort'));
});

ipc.on("UpdateStore-TCPListener", function (event, status) {
   UpdateStore_TCPListener(status);
   event.sender.send("TCPListenPort-Status", store.get('tcpListenPort'));
});

ipc.on("UpdateStore-TCPListenPort", function (event, port) {
   UpdateStore_TCPListenPort(port);
});

ipc.on("LoadStore-Notifications", function (event) {
   event.sender.send("Notifications-Status", store.get('notifications')); 
});

ipc.on("UpdateStore-Notifications", function (event, status) {
   UpdateStore_Notifications(status);
});

ipc.on("LaunchVirtualDeck", function (event) {
   createVirtualDeckWindow(); 
});

ipc.on("LoadStore-CurrentButtonContent", function (event) {
    var streamDeckRunning = false;
    
    if (myStreamDeck !== null)
    {
        streamDeckRunning = true;
    }
    
    event.sender.send("CurrentButtonContent", currentButtonContent, streamDeckRunning);
});

ipc.on("LoadStore-JsonButtonContent", function (event) {
    event.sender.send("JsonButtonContent", jsonButtonContent);  
});

ipc.on("LoadStore-DeckLocked", function (event) {
    event.sender.send("DeckLocked", store.get("DeckLocked"));
})

ipc.on("UpdateStore-VirtualDeckFollowState", function (event, status) {
   UpdateStore_VirtualDeckFollowState(status);
});

ipc.on("LoadStore-VirtualDeckFollowState", function (event) {
    event.sender.send("VirtualDeck-FollowState", store.get('virtualdeck-followstate'));  
});

ipc.on("StreamDeck-KeyPressDown", function (event, keyIndex) {
   StreamDeck_keypressDown(keyIndex);
});

ipc.on("VirtualDeck-FireButtonCommand", function (event, buttonObj) {
   StreamDeck_fireButtonCommand(buttonObj); 
});

ipc.on('FileDialogOpen-ButtonStructure', function (event) {
    const window = BrowserWindow.fromWebContents(event.sender);
    
    dialog.showOpenDialog(window, {
        filters:
        [
            {name: 'JSON Files', extensions: ['json']}
        ],
        properties: ['openFile', 'openDirectory']
    }, function (files) {
        if (files)
        {
            event.sender.send('FileSelected-ButtonStructure', files[0]);
            loadButtonStructureFile(files[0]);
            event.sender.send('StreamDeck-OfferRestart',"NewButtonFile");
        }
    });
});

ipc.on('FileDialogOpen-DeviceStructure', function (event) {
    const window = BrowserWindow.fromWebContents(event.sender);
    
    dialog.showOpenDialog(window, {
        filters:
        [
            {name: 'JSON Files', extensions: ['json']}
        ],
        properties: ['openFile', 'openDirectory']
    }, function (files) {
        if (files)
        {
            event.sender.send('FileSelected-DeviceStructure', files[0]);
            loadDeviceStructureFile(files[0]);
            event.sender.send('StreamDeck-OfferRestart',"NewDeviceFile");
        }
    });
});

ipc.on('EditorDeck-LoadButtonFile', function (event) {
    const window = BrowserWindow.fromWebContents(event.sender);
    
    dialog.showOpenDialog(window, {
        filters:
        [
            {name: 'JSON Files', extensions: ['json']}
        ],
        properties: ['openFile', 'openDirectory']
    }, function (files) {
        if (files)
        {
            EditorDeck_loadButtonStructureFile(files[0]);
        }
    });
});

ipc.on('EditorDeck-LoadLastButtonFile', function(event) {
    EditorDeck_loadLastButtonFile();
});

ipc.on('EditorDeck-LoadDeviceFile', function (event) {
    EditorDeck_loadDeviceStructureFile();
});

/**** End IPC Callbacks ****/

function loadButtonStructureFile(file)
{
    try
    {
        buttonContent = fs.readFileSync(file);
        jsonButtonContent = JSON.parse(buttonContent);
        if (jsonButtonContent.buttons)
        {
            store.set('buttonContentFile', file);   
        }
        else
        {
            // not a valid button file
        }
    }
    catch (err)
    {
        console.log(err);
    }
}

function EditorDeck_loadButtonStructureFile(file)
{
    try
    {
        var EditorDeck_buttonContent = fs.readFileSync(file);
        var EditorDeck_jsonButtonContent = JSON.parse(EditorDeck_buttonContent);
        if (EditorDeck_jsonButtonContent.buttons)
        {
            //send the objects to the editor deck
            editorWindow.webContents.send('EditorDeck-JsonButtonContent', EditorDeck_jsonButtonContent);
            store.set('EditorDeck-LastButtonFile', file);
        }
        else
        {
            // not a valid button file
        }
    }
    catch (err)
    {
        console.log(err);
    }
}

function EditorDeck_loadLastButtonFile()
{
try
    {
        var file = store.get('EditorDeck-LastButtonFile');
        if (file !== "")
        {
            var EditorDeck_buttonContent = fs.readFileSync(file);
            var EditorDeck_jsonButtonContent = JSON.parse(EditorDeck_buttonContent);
            if (EditorDeck_jsonButtonContent.buttons)
            {
                //send the objects to the editor deck
                editorWindow.webContents.send('EditorDeck-JsonButtonContent', EditorDeck_jsonButtonContent);
            }
            else
            {
                // not a valid button file
            }
        }
    }
    catch (err)
    {
        console.log(err);
    }
}

function EditorDeck_loadDeviceStructureFile()
{
    try
    {
        var EditorDeck_deviceContent = fs.readFileSync(store.get('deviceContentFile'));
        var EditorDeck_jsonDeviceContent = JSON.parse(EditorDeck_deviceContent);
        if (EditorDeck_jsonDeviceContent.devices)
        {
            //send the objects to the editor deck
            editorWindow.webContents.send('EditorDeck-JsonDeviceContent', EditorDeck_jsonDeviceContent);
        }
        else
        {
            // not a valid device file
        }
    }
    catch (err)
    {
        console.log(err);
    }
}

function loadDeviceStructureFile(file)
{
    try
    {
        deviceContent = fs.readFileSync(file);
        jsonDeviceContent = JSON.parse(deviceContent);
        if (jsonDeviceContent.devices)
        {
            store.set('deviceContentFile', file);   
        }
        else
        {
            // not a valid device file
        }
    }
    catch (err)
    {
        console.log(err);
    }
}

function UpdateStore_TCPListener(status)
{
    store.set('tcpListener', status);
    if (status) // make sure it's on or turn it on
    {
        if (!server.address())
        {
            initialListenerSetup();
        }
    }
    else // turn it off
    {
        if (server.address())
        {
            server.close();
            sendNotification("TCP Listener Service turned off.","on");
        }
    }
}

function UpdateStore_TCPListenPort(port)
{
    store.set('tcpListenPort', port);
}

function UpdateStore_Notifications(status)
{
    store.set('notifications', status);
    
    if (status)
    {
        sendNotification("Notifications turned on!","on");
    }
}

function UpdateStore_VirtualDeckFollowState(status)
{    
    if (status)
    {
        if (myStreamDeck === null)
        {
            sendNotification("Virtual Deck cannot follow state. The physical deck is not present or is in use.","on");
            store.set('virtualdeck-followstate', false);
        }
        else
        {
            sendNotification("Virtual Deck will follow state of physical Stream Deck.","on");
            store.set('virtualdeck-followstate', true);
        }
    }
    else
    {
        sendNotification("Virtual Deck will NOT follow state of physical Stream Deck.","on");
        store.set('virtualdeck-followstate', false);
    }
    
    virtualDeckWindow.webContents.send("VirtualDeck-FollowState", store.get('virtualdeck-followstate')); 
}

ipc.on("StreamDeck-Restart", function (event) {
    StreamDeck_TryToLoad();
    event.sender.send("FileSelected-ButtonStructure", buttonContentFile);
    event.sender.send("FileSelected-DeviceStructure", deviceContentFile);
});

function StreamDeck_TryToLoad()
{
    if ((buttonContent !== "")&&(deviceContent !== ""))
    {
        if(myStreamDeck === null)
        {
            initialSetup();
            initialListenerSetup();
        }
        else
        {
            sendNotification("Stream Deck restarting.", "on");
            myStreamDeck.clearAllKeys();
            myStreamDeck.device.removeAllListeners('data');
            myStreamDeck.device.close();
            myStreamDeck = null;
            StreamDeck_TryToLoad();
        }
    }
}

function initialSetup()
{
    try
    {
        myStreamDeck = new StreamDeck();
        
        myStreamDeck.on('down', keyIndex => {
            StreamDeck_keypressDown(keyIndex);   
        });

        myStreamDeck.on('error', error => {
            console.error(error);
        });

        myStreamDeck.clearAllKeys();
    }
    catch(error)
    {
        myStreamDeck = null;
        sendNotification("The Stream Deck is not connected or is in use. Virtual Deck is available.","on");
        UpdateStore_VirtualDeckFollowState(false);
        console.log(error);
    }
    finally
    {
        if (store.get("DeckLocked") === true)
        {
            StreamDeck_lockDeck();
        }
        else
        {
            StreamDeck_fillKeys(jsonButtonContent); // sets the current button state to the top level when it runs the first time
        }
        
        parentButtonContent = jsonButtonContent; // top level
    }
}

// STREAM DECK FUNCTIONS //
function StreamDeck_fillKeys(buttonContent) // fill the panel based on the current folder level
{   
    for (var i=0; i < buttonContent.buttons.length; i++)
    {
        if (buttonContent.buttons[i].buttonStates) // if the button supports multiple states, load the current state of the button
        {
            var buttonImage = buttonContent.buttons[i].buttonStates[0].buttonImage; // load the first button state if currentButtonStateID is not valid
                            
            if (buttonContent.buttons[i].currentButtonStateID)
            {                
                for (var j=0; j < buttonContent.buttons[i].buttonStates.length; j++)
                {
                    if (buttonContent.buttons[i].buttonStates[j].buttonStateID===buttonContent.buttons[i].currentButtonStateID)
                    {
                        buttonImage = buttonContent.buttons[i].buttonStates[j].buttonImage;
                    }
                }
            }
            StreamDeck_createButton(buttonContent.buttons[i].buttonNumber, buttonContent.buttons[i].name, buttonImage);
        }
        else // load using the regular image property
        {
            StreamDeck_createButton(buttonContent.buttons[i].buttonNumber, buttonContent.buttons[i].name, buttonContent.buttons[i].image);
        }
    }
    
    currentButtonContent = buttonContent;
    UpdateVirtualDeck();
}

function UpdateVirtualDeck()
{
    if (virtualDeckWindow !== null)
    {
        var streamDeckRunning = false;
    
        if (myStreamDeck !== null)
        {
            streamDeckRunning = true;
        }
    
        virtualDeckWindow.webContents.send("CurrentButtonContent", currentButtonContent, streamDeckRunning);
        virtualDeckWindow.webContents.send("JsonButtonContent", jsonButtonContent);
    }
}

function UpdateVirtualDeck_keypressDown(keyIndex)
{
    if (virtualDeckWindow !== null)
    {
        virtualDeckWindow.webContents.send("VirtualDeck-KeyPressDown", keyIndex);
    }
}

function StreamDeck_keypressDown(keyIndex)
{    
    var buttonObj = StreamDeck_findButtonByButtonNumber(keyIndex);
    
    if (buttonObj !== null)
    {   
        StreamDeck_getButtonParent(jsonButtonContent, buttonObj.id);
        StreamDeck_getButtonParent(jsonButtonContent, parentButtonContent.id);
        
        if (buttonObj.backButton) // if this was a back button, go up a folder
        {
            if (parentButtonContent === null) // if we are at the top level already
            {
                // add code to go to a logo or something
            }
            else // load the parent level
            {
                if (myStreamDeck !== null)
                {
                    myStreamDeck.clearAllKeys();
                }
                StreamDeck_fillKeys(parentButtonContent);
            }
        }
        else // if not a "back" button, check if it's a folder
        {       
            if (buttonObj.buttons) // if this is a folder with items in it
            {
                if (myStreamDeck !== null)
                {
                    myStreamDeck.clearAllKeys();
                }
                StreamDeck_fillKeys(buttonObj);
            }
            else // not a folder, so just run the trigger
            {
                StreamDeck_fireButtonCommand(buttonObj);
                UpdateVirtualDeck_keypressDown(keyIndex);
            }
        }        
    }            
}

function StreamDeck_fireButtonCommand(buttonObj)
{
    if (buttonObj.triggers)
    {
        // loop through sub array of triggers
        for (var i = 0; i < buttonObj.triggers.length; i++)
        {
            var host = "";
            var port = "";
            var triggerType = "";
            var trigger = "";
            
            var deviceID = "";
            
            var notify = "";
            
            if (buttonObj.triggers[i].notify) // notification override option - "on" = always show, "off" = never show, "" = user default
            {
                notify = buttonObj.triggers[i].notify;
            }
            else if (buttonObj.notify)
            {
                notify = buttonObj.notify;
            }
            
            if (buttonObj.triggers[i].deviceID)
            {
                deviceID = buttonObj.triggers[i].deviceID;
            }
            else if (buttonObj.deviceID)
            {
                deviceID = buttonObj.deviceID;
            }
            
            if (deviceID!=="")
            {
                var deviceObj = StreamDeck_getDevice(deviceID);
                
                if (deviceObj.host)
                {
                    host = deviceObj.host;
                }
                if (deviceObj.port)
                {
                    port = deviceObj.port;   
                }
                if (deviceObj.triggerType)
                {
                    triggerType = deviceObj.triggerType;
                }
            }
            
            if (buttonObj.triggers[i].host)
            {
                host = buttonObj.triggers[i].host;
            }
            else if (buttonObj.host)
            {
                host = buttonObj.host;
            }
            
            if (buttonObj.triggers[i].port)
            {
                port = buttonObj.triggers[i].port;
            }
            else if (buttonObj.port)
            {
                port = buttonObj.port;
            }
            
            if (buttonObj.triggers[i].triggerType)
            {
                triggerType = buttonObj.triggers[i].triggerType;
            }
            else if (buttonObj.triggerType)
            {
                triggerType = buttonObj.triggerType;
            }
            
            if (buttonObj.triggers[i].trigger)
            {
                trigger = buttonObj.triggers[i].trigger;
            }
            
            StreamDeck_fireTrigger(triggerType, host, port, trigger, notify);
        }
    }
    else
    {
        var host = "";
        var port = "";
        var triggerType = "";
        var trigger = "";
            
        var deviceID = "";
            
        var notify = "";
            
            if (buttonObj.notify)
            {
                notify = buttonObj.notify;
            }
            
            if (buttonObj.deviceID)
            {
                deviceID = buttonObj.deviceID;
            }
            
            if (deviceID!=="")
            {
                var deviceObj = StreamDeck_getDevice(deviceID);
                
                if (deviceObj.host)
                {
                    host = deviceObj.host;
                }
                if (deviceObj.port)
                {
                    port = deviceObj.port;   
                }
                if (deviceObj.triggerType)
                {
                    triggerType = deviceObj.triggerType;
                }
            }
            
            if (buttonObj.host)
            {
                host = buttonObj.host;
            }
            
            if (buttonObj.port)
            {
                port = buttonObj.port;
            }
            
            if (buttonObj.triggerType)
            {
                triggerType = buttonObj.triggerType;
            }
            
            if (buttonObj.trigger)
            {
                trigger = buttonObj.trigger;
            }
            
            StreamDeck_fireTrigger(triggerType, host, port, trigger, notify);
    }
}

function StreamDeck_fireTrigger(triggerType, host, port, trigger, notify)
{
    if (store.get("DeckLocked") === true)
    {
        sendNotification("Deck is locked and not currently accepting commands.", "on");
    }
    else
    {
        switch(triggerType.toUpperCase())
        {
            case "LOADBUTTONCONTENT":
                StreamDeck_fireTrigger_LoadButtonContent(trigger, notify);
                break;
            case "CHANGESTATE":
                StreamDeck_fireTrigger_ChangeButtonState(trigger, notify);
                break;
            case "TOGGLE":
                StreamDeck_fireTrigger_Toggle(trigger, notify);
                break;
            case "TCPMESSAGE":
                StreamDeck_fireTrigger_TCPMessage(host, port, trigger, notify);
                break;
            case "DASHBOARDWEBCALL":
                StreamDeck_fireTrigger_DashboardWebCall(host, port, trigger, notify);
                break;
            case "ROSSTALK":
                StreamDeck_fireTrigger_RossTalk(host, port, trigger, notify);
            case "OSC":
                StreamDeck_fireTrigger_OSC(host, port, trigger, notify);
                break;
            case "PROPRESENTER":
                //code here to run a ProPresenter command (using undocumented API)
                break;
            case "VIDEOHUB":
                StreamDeck_fireTrigger_VideoHub(host, port, trigger, notify);
                break;
            case "APPLICATION":
                //launch the requested application (DOES NOT CURRENTLY WORK)
                StreamDeck_fireTrigger_Application(trigger, notify);
                break;
            case "URL":
                StreamDeck_fireTrigger_URL(host, port, trigger, notify);
                break;
            case "NOTIFY":
                StreamDeck_fireTrigger_Notify(trigger, notify);
                break;
            case "CUSTOM":
                // possibility of running custom commands using other APIs, etc.
                break;
            default:
                sendNotification("Trigger did not meet conditions. No action was performed.", "on");
                break;
        }
    }
}

function StreamDeck_fireTrigger_LoadButtonContent(buttonID, notify)
{
    currentButtonObj = null;
    StreamDeck_findButton(jsonButtonContent, buttonID);
    if (currentButtonObj !== null)
    {
        currentButtonContent = currentButtonObj;
        if (myStreamDeck !== null)
        {
            myStreamDeck.clearAllKeys();
        }
        StreamDeck_fillKeys(currentButtonContent);

        sendNotification("Button Content changed to " + currentButtonContent.name, notify);   
    }
}

function StreamDeck_fireTrigger_ChangeButtonState(trigger, notify)
{
    var buttonID = trigger.substring(0, trigger.indexOf(" ")).replace(/\s+/g, "");
    var buttonStateID = trigger.substring(trigger.lastIndexOf(" ")).replace(/\s+/g, "");
    
    currentButtonObj = null;
    StreamDeck_findButton(jsonButtonContent, buttonID);
    
    if (currentButtonObj !== null)
    {
        var oldButtonStateID = currentButtonObj.currentButtonStateID;

        StreamDeck_changeButton(buttonID, buttonStateID);
        StreamDeck_fillKeys(currentButtonContent);

        sendNotification(currentButtonObj.name + " changed state from " + oldButtonStateID + " to " + buttonStateID, notify);
    }
}

function StreamDeck_fireTrigger_Toggle(trigger, notify)
{
    //expecting string like "ON buttonid" or "OFF buttonid"
    var buttonID = trigger.substring(trigger.lastIndexOf(" ")).replace(/\s+/g, "");
    var buttonStateID = "default";

    if (trigger.toUpperCase().indexOf("ON ")!== -1)
    {
        buttonStateID = "toggle";
    }
    else
    {
        buttonStateID = "default";
    }
    StreamDeck_toggleButton(buttonID, buttonStateID);
    StreamDeck_fillKeys(currentButtonContent);
    
    sendNotification("Button Toggled.",notify);
}

function StreamDeck_fireTrigger_TCPMessage(host, port, trigger, notify)
{
    if (port === "")
    {
        port = "23";
    }
    if (host !== "")
    {   
        var connection = net.connect(port, host);
        var buf = new Buffer(trigger + "\r\n");
        connection.write(buf);   
        
        sendNotification("TCP Message sent to " + host + ": " + trigger, notify);
    }
}

function StreamDeck_fireTrigger_DashboardWebCall(host, port, trigger, notify)
{    
    http.get({
    host: host,
    port: port,
    path: '/ajax/' + trigger
    }, function(response) {
                //console.log(response);
        response.setEncoding('utf8');
        var data = "";

        response.on('data', function(chunk) {
            data += chunk;
        });

        response.on('end', function() {
            if(data.length > 0) {
                try {
                    var data_object = JSON.parse(data);
                    //console.log(data_object);
                } catch(e) {
                    return;
                }
            }
        });
    }).on("error", function (){console.log("GET request error");});
    
    sendNotification("DashboardWebCall sent to " + host + ":" + port + " : " + trigger, notify);
}

function StreamDeck_fireTrigger_RossTalk(host, port, trigger, notify)
{
    if (port === "")
    {
        port = "7788";
    }
    if (host !== "")
    {   
        var connection = net.connect(port, host);
        var buf = new Buffer(trigger + "\r\n");
        connection.write(buf);   
        
        sendNotification("RossTalk Command sent to " + host + ": " + trigger, notify);
    }
}

var udpPort = null;

function StreamDeck_fireTrigger_OSC(host, port, trigger, notify)
{
    if (udpPort !== null)
    {
        udpPort.close();
    }
    
    if (port === "")
    {
        port = "8000";
    }
    
    udpPort = new osc.UDPPort({
        localAddress: "127.0.0.1",
        localPort: 57121,
        metadata: true
    });
        
    udpPort.on("error", function (error) {
        console.log("An error occurred on UDP port: ", error.message);
    });
    
    var msg = null;
    
    if (typeof trigger !== 'object')
    {
         msg = {
            address: trigger
        };   
    }
    else
    {
        msg = trigger;
    }
 
    // Open the socket.
    udpPort.open();


    // When the port is ready, send the OSC message
    udpPort.on("ready", function () {
        udpPort.send(msg, host, port);
    });
        
    sendNotification("OSC Command sent to " + host + " (" + port + ") : " + JSON.stringify(trigger), notify);
}

function StreamDeck_fireTrigger_VideoHub(host, port, trigger, notify)
{
    if (port === "")
    {
        port = "9990";
    }
    
    if (host !== "")
    {
        //expecting string like "1 1" (destination source)
        var destination = parseInt(trigger.substring(0, trigger.indexOf(" ")).replace(/\s+/g, "")); // not zero based yet
        var source = parseInt(trigger.substring(trigger.lastIndexOf(" ")).replace(/\s+/g, "")); // not zero based yet
        
        destination--; //convert to zero based
        source--; // convert to zero based
        
        var telnetScript = "VIDEO OUTPUT ROUTING:\r\n";        
        telnetScript += destination + " " + source + "\r\n\r\n";
        
        var connection = net.connect(port, host);
        var buf = new Buffer(telnetScript);
        connection.write(buf);   
        
        sendNotification("VideoHub (" + host + ") Route Change: Output#" + (destination+1) + " set to " + (source+1) + ".", notify);
    }
}

function StreamDeck_fireTrigger_Application(trigger, notify)
{
    /*var spawn = require('child_process').spawn;
    var executablePath = trigger;

    var cp = spawn(executablePath);
    
    cp.stdout.on('data', (data) => {
        console.log('stdout: ' + data);
    });

    cp.stderr.on('data', (data) => {
        console.log('stderr: ' + data);
    });

    cp.on('close', (code) => {
        console.log('child process exited with code' + code);
    });*/
    
    //sendNotification("Application launched.", "");
}

function StreamDeck_fireTrigger_URL(host, port, trigger, notify)
{
    var url = "";
    
    if (host!=="")
    {
        if (port === "")
        {
            port = "80";
        }
        
        url = host + ":" + port + "/" + trigger;
    }
    else
    {
        url = trigger;
    }
   
    if (url !== "")
    {
        if (!(url.includes("http://")) || (url.includes("https://")))
        {
            url = "http://" + url;
        }
        http.get(url).on("error", function (){console.log("GET request error");});
        
        sendNotification("URL Requested in Background: " + url, notify);
    }
}

function StreamDeck_fireTrigger_Notify(trigger, notify)
{
    sendNotification(trigger, notify);
}

function StreamDeck_getDevice(deviceID)
{
    var found = false;
    var deviceObj = {};
    
    for (var i = 0; i < jsonDeviceContent.devices.length; i++)
    {
        if (jsonDeviceContent.devices[i].deviceID === deviceID)
        {
            found = true;
            deviceObj = jsonDeviceContent.devices[i];
        }
    }
    
    if (!found)
    {
        deviceObj = null;
    }
    
    return deviceObj;
}

function StreamDeck_findButtonByButtonNumber(buttonNumber)
{
    var found = false;
    var buttonObj = {};
    
    for (var i = 0; i < currentButtonContent.buttons.length; i++)
    {
        if (currentButtonContent.buttons[i].buttonNumber === buttonNumber)
        {
            found = true;
            buttonObj = currentButtonContent.buttons[i];
        }
    }
    
    if (!found)
    {
        buttonObj = null;
    }
    
    return buttonObj;
}

function StreamDeck_findButton(buttonContent, buttonID)
{   
    for (var i = 0; i < buttonContent.buttons.length; i++)
    {
        if (buttonContent.buttons[i].id === buttonID)
        {
            currentButtonObj = buttonContent.buttons[i];
        }
        else if (buttonContent.buttons[i].buttons)
        {
            StreamDeck_findButton(buttonContent.buttons[i], buttonID);
        }
    }
}

function StreamDeck_findButtonAndChangeState(buttonContent, buttonID, buttonStateID)
{
    for (var i = 0; i < buttonContent.buttons.length; i++)
    {
        if (buttonContent.buttons[i].id === buttonID)
        {
            if (buttonContent.buttons[i].buttonStates)
            {
                for (var j = 0; j < buttonContent.buttons[i].buttonStates.length; j++)
                {
                    if (buttonContent.buttons[i].buttonStates[j].buttonStateID === buttonStateID)
                    {
                        if (buttonContent.buttons[i].currentButtonStateID)
                        {
                            buttonContent.buttons[i].currentButtonStateID = buttonContent.buttons[i].buttonStates[j].buttonStateID;
                        }
                    }
                }
            }
        }
        else if (buttonContent.buttons[i].buttons)
        {
            StreamDeck_findButtonAndChangeState(buttonContent.buttons[i], buttonID, buttonStateID);
        }
    }
}

function StreamDeck_findButtonsInButtonGroup(buttonContent, buttonGroup, buttonStateID)
{
    for (var i = 0; i < buttonContent.buttons.length; i++)
    {
        if (buttonContent.buttons[i].buttonGroup === buttonGroup)
        {
            //check here that the button we found has a button state of what we passed
            // if it does, great, if not, set the current button state to the first state declared as a default
            buttonContent.buttons[i].currentButtonStateID = "default";
            
            if (buttonContent.buttons[i].buttonStates)
            {
                buttonContent.buttons[i].currentButtonStateID = buttonContent.buttons[i].buttonStates[0].buttonStateID;
                
                for (var j = 0; j < buttonContent.buttons[i].buttonStates.length; j++)
                {
                    if (buttonContent.buttons[i].buttonStates[j].buttonStateID === buttonStateID)
                    {
                        buttonContent.buttons[i].currentButtonStateID = buttonStateID;
                    }
                }
            }
        }
        else if (buttonContent.buttons[i].buttons)
        {
            StreamDeck_findButtonsInButtonGroup(buttonContent.buttons[i], buttonGroup, buttonStateID);
        }
    }
}
    
function StreamDeck_getButtonParent(buttonContent, buttonID)
{
    parentButtonContent = null;
    
    for (var i = 0; i < buttonContent.buttons.length; i++)
    {
        if (buttonContent.buttons[i].id === buttonID)
        {
            parentButtonContent = buttonContent;
        }
        else if (buttonContent.buttons[i].buttons)
        {
            StreamDeck_getButtonParent(buttonContent.buttons[i], buttonID);
        }
    }
    
    if (parentButtonContent === null)
    {
        parentButtonContent = jsonButtonContent;
    }
}

function StreamDeck_clearKeys()
{   
    for (var i = 0; i < 15; i++)
    {
        StreamDeck_createButton(i,"","");
    }
}

const sharp = require('sharp');

function StreamDeck_createButton(keyIndex, buttonText, buttonImage)
{
    var buttonImagePath = "";
    
    if (buttonImage === "")
    {
        buttonImagePath = path.resolve(__dirname, 'fixtures/black.png');
    }
    else
    {
        buttonImagePath = buttonImage;
    }
    
    if (myStreamDeck !== null)
    {
        // add code here at some point to bake button text onto button image and fill deck button with that
        myStreamDeck.fillImageFromFile(keyIndex, buttonImagePath)
		.catch(error => {
			console.error(error);
		});
    }
}

function StreamDeck_toggleButton(buttonID, buttonStateID)
{
    currentButtonObj = null;
    StreamDeck_findButton(jsonButtonContent, buttonID);

    if (currentButtonObj !== null)
    {
        var buttonGroup = currentButtonObj.buttonGroup;

        StreamDeck_findButtonsInButtonGroup(jsonButtonContent, buttonGroup, "default");
        StreamDeck_findButtonsInButtonGroup(currentButtonContent, buttonGroup, "default");

        StreamDeck_findButtonAndChangeState(jsonButtonContent, buttonID, buttonStateID); // find it in the master list of button objects    
        StreamDeck_findButtonAndChangeState(currentButtonContent, buttonID, buttonStateID); // find it in the current button content list
        
        UpdateVirtualDeck();
    }
}

function StreamDeck_changeButton(buttonID, buttonStateID)
{
    StreamDeck_findButtonAndChangeState(jsonButtonContent, buttonID, buttonStateID); // find it in the master list of button objects    
    StreamDeck_findButtonAndChangeState(currentButtonContent, buttonID, buttonStateID); // find it in the current button content list
    UpdateVirtualDeck();
}

function StreamDeck_triggerButton(buttonID)
{
    currentButtonObj = null;
    StreamDeck_findButton(jsonButtonContent, buttonID);
    if (currentButtonObj !== null)
    {
        StreamDeck_fireButtonCommand(currentButtonObj);
    }
}

function StreamDeck_lockDeck()
{
    store.set("DeckLocked", true);
    
    if (myStreamDeck !== null)
    {
        myStreamDeck.clearAllKeys();
    }
    var lockedButtonText = '{"buttons":[{"buttonNumber": 7,"id": "lock","name": "Lock","image": "fixtures/lock.png"}]}';
    var lockedButtonContent = JSON.parse(lockedButtonText);
    currentButtonContent = lockedButtonContent;
    
    if (virtualDeckWindow !== null)
    {
        virtualDeckWindow.webContents.send("DeckLocked", true);
    }
}

function StreamDeck_unlockDeck()
{
    store.set("DeckLocked", false);
    
    if (myStreamDeck !== null)
    {
        myStreamDeck.clearAllKeys();
    }
    currentButtonContent = jsonButtonContent;
    
    if (virtualDeckWindow !== null)
    {
        virtualDeckWindow.webContents.send("DeckLocked", false);
    }
}
// END STREAM DECK FUNCTIONS //

// SERVER LISTENER //
function initialListenerSetup()
{
    var tcpListener = store.get('tcpListener');
    
    streamDeck_listenPort = store.get('tcpListenPort'); // port this TCP service should listen on
    
    if (tcpListener)
    {
        if (streamDeck_listenPort !== "")
        {
            server.on('connection', handleConnection);

            server.listen(streamDeck_listenPort, function() {  
                sendNotification("TCP Server listening to " + server.address().port,"");
                console.log('server listening to %j', server.address());
            });
        }
    }
}

function handleConnection(conn) {  
  var remoteAddress = conn.remoteAddress + ':' + conn.remotePort;
  //console.log('new client connection from %s', remoteAddress);

  conn.setEncoding('utf8');

  conn.on('data', onConnData);
  conn.once('close', onConnClose);
  conn.on('error', onConnError);

  function onConnData(d) {
    //console.log('connection data from %s: %j', remoteAddress, d);
    
    var commandsReceived = d.split("\r\n");
    
    var redrawNeeded = false;
    
    for (var i = 0; i < commandsReceived.length; i++)
    {
        if (commandsReceived[i].substring(0,6).toUpperCase()==="TOGGLE")
        {
            //expecting string like "TOGGLE ON buttonid"
            var buttonID = commandsReceived[i].substring(commandsReceived[i].lastIndexOf(" ")).replace(/\s+/g, "");
            
            var trigger = "";

            if (commandsReceived[i].toUpperCase().indexOf(" ON ")>0)
            {
                trigger = "ON " + buttonID;
            }
            else
            {
                trigger = "OFF " + buttonID;
            }

            StreamDeck_fireTrigger("toggle", "", "", trigger, "");
            redrawNeeded = true;
        }
        else if (commandsReceived[i].substring(0,11).toUpperCase()==="CHANGESTATE")
        {
            //expecting string like "CHANGESTATE buttonID buttonStateID"
            var buttonID = commandsReceived[i].substring(commandsReceived[i].indexOf(" "),commandsReceived[i].lastIndexOf(" ")).replace(/\s+/g, "");
            var buttonStateID = commandsReceived[i].substring(commandsReceived[i].lastIndexOf(" ")).replace(/\s+/g, "");
            
            var trigger = buttonID + " " + buttonStateID;
            StreamDeck_fireTrigger("changestate", "", "", trigger, "");
            redrawNeeded = true;
        }
        else if (commandsReceived[i].substring(0,17).toUpperCase()==="LOADBUTTONCONTENT")
        {
            var buttonID = commandsReceived[i].substring(commandsReceived[i].lastIndexOf(" ")).replace(/\s+/g, "");
            StreamDeck_fireTrigger("loadbuttoncontent", "", "", buttonID, "");
        }
        else if (commandsReceived[i].substring(0,4).toUpperCase()==="LOCK")
        {
            StreamDeck_lockDeck();
            redrawNeeded = true;
        }
        else if (commandsReceived[i].substring(0,6).toUpperCase()==="UNLOCK")
        {
            StreamDeck_unlockDeck();
            redrawNeeded = true;
        }
        else if (commandsReceived[i].substring(0,7).toUpperCase()==="TRIGGER")
        {
            //TRIGGER buttonID
            var buttonID = commandsReceived[i].substring(commandsReceived[i].lastIndexOf(" ")).replace(/\s+/g, "");
            StreamDeck_triggerButton(buttonID);
        }
        else if (commandsReceived[i].substring(0,6).toUpperCase()==="NOTIFY")
        {
            var message = commandsReceived[i].substring(commandsReceived[i].lastIndexOf(" ")).replace(/\s+/g, "");
            sendNotification(message,"on");
        }
        else
        {
            //console.log("No applicable command received.");
        }
    }
    
    if (redrawNeeded)
    {
        StreamDeck_fillKeys(currentButtonContent);
    }
        
    conn.write("Command received.\r\n");
  }

  function onConnClose() {
    //console.log('connection from %s closed', remoteAddress);
  }

  function onConnError(err) {
    console.log('Connection %s error: %s', remoteAddress, err.message);
  }
}
// END SERVER LISTENER //