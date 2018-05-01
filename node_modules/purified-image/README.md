# node-purified-image
[![Build Status](https://travis-ci.org/megahertz/node-purified-image.svg?branch=master)](https://travis-ci.org/megahertz/node-purified-image)
[![npm version](https://badge.fury.io/js/purified-image.svg)](https://badge.fury.io/js/purified-image)

## Description

Load, save and draw on image with API similar to HTML Canvas Context 2D.
No native dependencies. Wrap 
[PureImage](https://github.com/joshmarinacci/node-pureimage) library.

## Requirements
 - node >= 6

## PureImage

PureImage is a pure JavaScript implementation of an image drawing and encoding
API, based on HTML Canvas, for NodeJS. It has no native dependencies.  

Current features:

* set pixels
* stroke and fill paths (rectangles, lines, quadratic curves)
* copy images
* export to PNG
* render text (no bold or italics yet)

## Installation

Install with [npm](https://npmjs.org/package/purified-image):

    npm install purified-image

## Usage

```js
const Image = require('purified-image');

let image = new Image('img/template.png');
image
  .loadFont('/res/OpenSans.ttf')
  .draw(ctx => {
    ctx.fillStyle = '#000000';
    ctx.setFont('Open Sans', 20);
    ctx.fillText('example', 30, 30);
  })
  .save('out.jpg')
  .then(() => console.log('saved'));
```
    
## API
[class Image](docs/api-Image.md)

## License

Licensed under MIT.