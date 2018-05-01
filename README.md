# StreamDeckProductionController
Node JS Implementation using Elgato Stream Deck as production controller. Buttons can be configured to send multiple actions to various protocols like RossTalk, OSC, VideoHub, HTTP requests, etc.

<b>Field Descriptions:</b>
              <ul>
                  <li><i>buttonNumber</i>: The zero-based key index where the button should fall on the physical device. 0 is top right, flowing to the left in rows.</li>
                  <li><i>id</i>: The unique button ID for this button. Must be globally unique for certain functions to work properly.</li>
                  <li><i>name</i>: The friendly name of this button. Useful for notifications.</li>
                  <li><i>buttonStates</i>: Array of button states representing different images that can be presented on that button. See exmaples below.</li>
                  <li><i>image</i>: If a button has no states, you can define its image location here.</li>
                  <li><i>currentButtonStateID</i>: The default or current button state to be displayed. If left undeclared, "default" or the first button state declared will be used.</li>
                  <li><i>buttonGroup</i>: The name of the group this button is associated with. Primarily used for toggling/radio button functionality. Any button that should act like a toggle should have a buttonGroup defined.</li>
                  <li><i>deviceID</i>: Device associated with this button. Useful when several buttons refer to the same host/port often. See device help for more information.</li>
                  <li><i>triggerType</i>: The trigger type that this button will use. See examples.</li>
                  <li><i>host</i>: If no deviceID is listed, you can optionally include a host declaration.</li>
                  <li><i>port</i>: If no deviceID is listed, you can optionally include a port declaration.</li>
                  <li><i>trigger</i>: The message, URL, command, etc. to be sent.</li>
                  <li><i>triggers</i>: An array of triggers representing different trigger types that can be fired when the button is pressed. They will run sequentially. See examples below.</li>
                  <li><i>backButton</i> true or false. If true, the button will act as a "back" button and go up a level in the folder structure. No triggers or commands can be run on a back button.</li>
              </ul>
              
<b>Button States:</b>
              Any button can have multiple button states defined by using the <i>buttonStates</i> array property.
              <ul>
                  <li><i>buttonStateID</i>: The identifier of the button state. Does not have to be globally unique, just unique to that button.</li>
                  <li><i>buttonImage</i>: The file path of the button image that should be loaded when this button state is requested.</li>
              </ul>
              
<b>Trigger Types:</b><br />
              Several trigger types are available. These define what action the button will take when pressed. The <i>triggerType</i> specifies the type of action, and <i>trigger</i> specifies the message, command, etc.
              <ul>
                  <li><i>LoadButtonContent</i>: Jump from the current folder of buttons to the buttonID defined in <i>trigger</i>.</li>
                  <li><i>ChangeState</i>: Change the state of a buttonID to a corresponding buttonStateID. The <i>trigger</i> definition should be: <i>"buttonID buttonStateID"</i>.</li>
                  <li><i>Toggle</i>: Toggle a button on or off. Trigger definition should be <i>"toggle on buttonID"</i> or <i>"toggle off buttonID"</i>. If "on", that button will change to its "toggle" state and all buttons in that button's buttonGroup will change to their "default" state. If "off", all buttons in that buttonGroup will return to their default state.</li>
                  <li><i>DashboardWebCall</i>: Sends a GPI command to a Ross Dashboard custom panel at the HTTP Trigger Port declared in the custom panel. Requires a deviceID or a host/port to be declared to work properly.</li>
                  <li><i>RossTalk</i>: Sends a RossTalk command to a Ross device. Requires a deviceID or host/port to be declared. Assumes port 7788 if left undefined.</li>
                  <li><i>TCPMessage</i>: Sends a TCP command to the listed device. Requires a deviceID or host/port to be declared. Assumes port 23 (telnet default) if left undefined. Use this if you want to remotely control a StreamDeck connected to another computer or device.</li>
                  <li><i>OSC</i>: Sends OSC messages to a device. Requires a deviceID or host/port to be declared. Assumes port 8000 if left undefined.<br /><br />
                        Triggers can be strings for simple commands that don't include objects. Otherwise, define your object like this:
                        <pre>{
"address": "/address1/address2",
"args": [
    {
        "type": "f",
        "value": 440
    }
  ]
}</pre>
                  </li>
                  <li><i>VideoHub</i>: Sends routing changes to a Blackmagic VideoHub. Requires a deviceID or host/port to be declared. Assumes port 9990 if left undefined.</li>
                  <li><i>Application</i>: Launches the app defined in <i>trigger</i>. Requires an absolute path.</li>
                  <li><i>URL</i>: Sends a background URL request defined in <i>trigger</i>. If a deviceID or host/port are defined, the request will use those as prefix to the request. Assumes port 80 if left undefined.</li>
                  <li><i>Notify</i>: Sends a notification to the screen. Use the <i>notify</i> property of the trigger object itself to override global notification preferences if needed. The message in <i>trigger</i> is what will be sent.</li>
              </ul>
              
<b>Trigger Arrays:</b><br />
              Any button can have multiple trigger types assigned by using the <i>triggers</i> array property.
              <ul>
                  <li><i>deviceID</i>: If listed, this will override any deviceID declared in the button property itself.</li>
                  <li><i>triggerType</i>: If listed, this will override any triggerType declared in the button property or any deviceIDs included.</li>
                  <li><i>host</i>: If listed, this will override any other host values within the button properties.</li>
                  <li><i>port</i>: If listed, this will override any other port values within the button properties.</li>
                  <li><i>trigger</i>: The message or command to be sent.</li>
                  <li><i>notify</i>: Used to override global preferences from Settings. If <i>on</i>, this trigger will always show a notification. If <i>off</i>, it will never show one.</li>
              </ul>

<b>Device Structure:</b><br /><br />
              
<i>Sample Device Structure</i><br/>
<pre>
{
    "devices":
    [
        {
            "deviceID": "Dashboard-1",
            "deviceName": "Dashboard Production Control",
            "host": "192.168.11.141",
            "port": "5400",
            "triggerType": "DashboardWebCall"
        },
        {
            "deviceID": "Carbonite-1",
            "deviceName": "Carbonite 1",
            "host": "192.168.11.126",
            "port": "7788",
            "triggerType": "RossTalk"
        },
        {
            "deviceID": "VideoHub-1",
            "deviceName": "FG Tech VideoHub Auditoriums",
            "host": "192.168.11.128",
            "port": "9990",
            "triggerType": "VideoHub"
        }
    ]
}
              </pre><br /><br />
              <b>Field Descriptions:</b>
              <ul>
                  <li><i>deviceID</i>: A unique identifier so that this device can be located. Referenced in button structure.<br /><br /></li>
                  <li><i>deviceName</i>: A helpful name for the device, used in notifications and other areas.<br /><br /></li>
                  <li><i>host</i>: The host name or IP address of the device you are messaging with.<br /><br /></li>
                  <li><i>port</i>: The port of the device you are messaging with. Some devices assume default ports if this is unspecified.</li>
                  <li><i>triggerType</i>: The default trigger type associated with this device. See examples.</li>
              </ul>
              
<b>Available/Applicable Trigger Types for Devices:</b>
<ul>
                  <li><i>DashboardWebCall</i>: For making calls to a Ross Dashboard Custom Panel that has its HTTP Trigger Port assigned, to activate a button on that panel with a GPI assigned.<br />
                      Example call: <i>http://ipaddress:port/ajax/GPI</i><br /><br /></li>
                  <li><i>RossTalk</i>: For sending RossTalk commands to the specified device. Assumes port 7788 if left undefined.<br /><br /></li>
                  <li><i>TCPMessage</i>: Sends a TCP command to the listed device. Requires a deviceID or host/port to be declared. Assumes port 23 (telnet default) if left undefined. Use this if you want to remotely control a StreamDeck connected to another computer or device.<br /><br /></li>
                  <li><i>OSC</i>: For sending OSC messages to the specified device. Assumes port 8000 if left undefined.<br /><br /></li>
                  <li><i>VideoHub</i>: For sending output routing changes to a BlackMagic VideoHub. Assumes port 9990 if left undefined.<br /><br /></li>
                  <li><i>URL</i>: For sending URL requests to the specified host and port. Assumes port 80 if left undefined.</li>
              </ul>

<b>Making TCP Changes to the StreamDeck:</b><br /><br />
              By default, the software is set up to accept the following commands:
              <ul>
                  <li>Command: <i>TOGGLE buttonID on</i> or <i>TOGGLE buttonID off</i><br />
                  If "on" is specified, the buttonID passed will change from the "default" button state to the "toggle" button state.<br />
                  It will also change the state of all buttonIDs in that buttonID's buttonGroup back to their "default" state. If they do not have a "default" state declared, they will change to their first defined button state.<br /><br />
                  If "off" is specified, the buttonID will toggle off along with all members of that buttonID's buttonGroup.<br /><br />
                  See Button Structure help for more information.<br /><br />
                  </li>
                  <li>Command: <i>CHANGESTATE buttonID buttonStateID</i><br />
                      Changes the state of <i>buttonID</i> to <i>buttonStateID</i>. If the buttonID or buttonStateID is not valid or not found, nothing is changed.<br /><br/>
                  </li>
                  <li>Command: <i>LOADBUTTONCONTENT buttonID</i><br />
                      Jumps to the specified folder <i>buttonID</i>.<br /><br />                      
                  </li>
                  <li>Command: <i>TRIGGER buttonID</i><br />
                      Runs the triggers attached to that buttonID, as if the button was pressed. No action is performed if the buttonID is not valid or not found.<br /><br/>
                  </li>
                  <li>Command: <i>LOCK</i><br />
                      Locks the panel so that no buttons can be pressed. Displays a lock icon.<br /><br />
                  </li>
                  <li>Command: <i>UNLOCK</i><br />
                      Unlocks the panel and returns to the root folder so normal function can resume.<br /><br />
                  </li>
                  <li>Command: <i>NOTIFY</i><br />
                      Force a notification to the user. (Overrides their preferences and sends a notification upon receipt. Message truncated after 140 characters.)                      
                  </li>
              </ul>
