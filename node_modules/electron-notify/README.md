# electron-notify
*Nice and simple notifications for electron apps*

![Mac demo](https://raw.githubusercontent.com/hankbao/electron-notify/gh-pages/electron-notify-mac-small.png)
![Win demo](https://raw.githubusercontent.com/hankbao/electron-notify/gh-pages/electron-notify-windows-small.png)

*electron-notify* displays notifications in the lower right corner. Notifications are stacked (most recent on the top) and slide down, once they expire. *electron-notify* is forked from [nw-notify](https://github.com/cgrossde/nw-notify) which displays notifications for nw.js apps.

## Features

* Windows and Mac supported (Linux not tested, but should work)
* AppIcons (optional, left of notification text) and images (optional, right of notification text)
* Sounds
* Close button (top right corner)
* Open URLs (optional)
* Callbacks for `show`, `click` and `close`
* Queues notifications if not all can be shown at once

## Usage

```JavaScript
var eNotify = require('electron-notify');
// Change config options
eNotify.setConfig({
    appIcon: path.join(__dirname, 'images/icon.png'),
    displayTime: 6000
});

// Send simple notification
eNotify.notify({ title: 'Notification title', text: 'Some text' });
// Notification with URL, click notification to open
eNotify.notify({ title: 'Notification title', text: 'Some text', url: 'http://wikipedia.org'});
// Or with image and playing a sound on show
eNotify.notify({
    title: 'Notification title',
    text: 'Some text', url: 'http://wikipedia.org',
    image: path.join(__dirname, 'images/image.png'),
    sound: path.join(__dirname, 'sound.wav')
});
// Do something when user clicks on notification
eNotify.notify({ title: 'Custom func', onClickFunc: function() {
    // Your code here
    console.log('User clicked notification')
}});

// Change config options between notify calls
eNotify.setConfig({
    appIcon: path.join(__dirname, 'images/otherIcon.png'),
    defaultStyleText: {
        color: '#FF0000',
        fontWeight: 'bold'
    }
});
// Send notification that uses the new options
eNotify.notify({ title: 'Notification title', text: 'This text is now bold and has the color red' });

// See below for more options
```

## Function reference

### notify(notificationObj)
Display new notification. For possible properties see example below:

~~~
notify({
    title: 'Title',
    text: 'Some text',
    image: 'path/to/image.png',
    url: 'http://google.de',
    sound: path.join(__dirname, 'notification.wav'),
    onClickFunc: function() { alert('onCLick') },
    onShowFunc: function() { alert('onShow') },
    onCloseFunc: function() { alert('onClose')}
});
~~~

For more info on the `onClickFunc`, `onShowFunc` and `onCloseFunc` callbacks see below.

### setConfig(configObj)
Change some config options. Can be run multiple times, also between `notify()`-calls to change *electron-notify*s behaviour.

### closeAll()
Clears the animation queue and closes all windows opened by *electron-notify*. Call this to clean up before quiting your app.

### setTemplatePath(path)
If you want to use your own `notification.html` you use this method. Use it like this: `eNotify.setTemplatePath(path.join(__dirname, 'path/to/notification.html'));`

### calcMaxVisibleNotification() : int
Returns the maximum amount of notifications that fit onto the users screen.

## Max notifications and queueing

On startup *electron-notify* will determine the maximum amount of notifications that fit on the screen. This value will be stored in `config.maxVisibleNotifications` but cannot be greater than 7. This is to ensure that all animations go smoothly and *electron-notify* does not freeze your computer. However you can overwrite this value with `setConfig()`. If you do that you should use `calcMaxVisibleNotification()` to check if that many notifications fit onto the users screen.
**Queueing:** Once the limit of `config.maxVisibleNotifications` is reached, *electron-notify* will queue all new notifications internally. The order of `notifiy()`-calls will be preserved and once old notifications fade out, the queued notifications are shown.

## Callbacks

Calling `notify()` will return an unique id for this particular notification. Each callback (`onClickFunc`, `onShowFunc`, `onCloseFunc`) will return an event object which contains the notification id, the event name(click, show, close, timeout, closeByAPI) and a function to close the notification:

```JavaScript
{
    id: 32,
    name: 'click',
    closeNotification: function() {}
}
```

**Example**
```JavaScript
function handleClick(event) {
    console.log('User clicked notification ' + event.id + '. Closing it immediately.');
    event.closeNotification();
}

function handleClose(event) {
    console.log('Notification was closed because: ' + event.name);
}

eNotify.notify({
    title: 'Notification title',
    text: 'Some text',
    onClickFunc: handleClick,
    onCloseFunc: handleClose
});
```

## Config options
Default config:

```JavaScript
  {
    width: 300,
    height: 65,
    padding: 10,
    borderRadius: 5,
    displayTime: 5000,
    animationSteps: 5,
    animationStepMs: 5,
    animateInParallel: true,
    appIcon: null,
    pathToModule: '',
    logging: true,
    defaultStyleContainer: {
      backgroundColor: '#f0f0f0',
      overflow: 'hidden',
      padding: 8,
      border: '1px solid #CCC',
      fontFamily: 'Arial',
      fontSize: 12,
      position: 'relative',
      lineHeight: '15px'
    },
    defaultStyleAppIcon: {
      overflow: 'hidden',
      float: 'left',
      height: 40,
      width: 40,
      marginRight: 10,
    },
    defaultStyleImage: {
      overflow: 'hidden',
      float: 'right',
      height: 40,
      width: 40,
      marginLeft: 10,
    },
    defaultStyleClose: {
      position: 'absolute',
      top: 1,
      right: 3,
      fontSize: 11,
      color: '#CCC'
    },
    defaultStyleText: {
      margin: 0,
      overflow: 'hidden',
      cursor: 'default'
    },
    defaultWindow: {
      alwaysOnTop: true,
      skipTaskbar: true
      resizable: false,
      show: false,
      frame: false,
      transparent: true,
      acceptFirstMouse: true
    }
  }
```

## Changelog

### 0.1.0

**0.1.0 - Initial version**

## License

    The MIT License (MIT)

    Copyright (c) 2016 Hank Bao <hankbao84@gmail.com> (https://github.com/hankbao)

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
