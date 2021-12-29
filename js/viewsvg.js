/// <reference path="common.js" />
/* global Settings, modalAlert, saveSettings, StoreName, getStringBetween,
   getFiltersCss, getModalInputText, modalPrompt, modalAlert,
   modalConfirm, exportSvg, exportPng, setupModal, createElementFromHtml,
   setupOfflineIndicator, Mouse, backOrHome */

// Constants
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const STYLE_ID = 'm365MapsHighlights';
const DRAW_CLASS = 'm365maps-draw';
const TEXT_CLASS = 'm365maps-text';
const HIGH_CLASS_1 = 'highlight1';
const HIGH_CLASS_2 = 'highlight2';
const HIGH_CLASS_3 = 'highlight3';
const SCROLL_STEP_SIZE = 0.05;
const ZOOM_STEP_SIZE = 20;

/** Edit Modes. */
const EditModes = {
  Off: 0,
  Highlight: 1,
  Draw: 2,
  Text: 3,
  // Select: 4,
  // Erase: 5,
}

/** Edit Mode Actions. */
const Actions = {
  None: 0, // No action
  Add: 1, // Click
  Move: 2, // Click + Drag
  Erase: 3, // Right-Click + Drag
  Resize: 4, // Ctrl
  Rotate: 5, // Shift
  Scroll: 6, // Click + Drag
}

/** Page Data. */
const Data = {
  Action: {
    Active: false,
    Type: Actions.None,
  },
  Colours: [
    'red',
    'orange',
    'yellow',
    'green',
    'blue',
    'purple',
    'black',
  ],
  Controls: {
    Brightness: undefined,
    Contrast: undefined,
    Hue: undefined,
    Open: false,
    Saturation: undefined,
  },
  Edit: {
    HasEdits: false,
    Mode: EditModes.Off,
    Node: undefined,
    Centre: {
      X: 0,
      Y: 0,
    },
    Transform: {
      Rotate: 0,
      Scale: 1,
      Translate: {
        X: 0,
        Y: 0,
      },
      StartScale: 1,
    },
  },
  Filename: '',
  Flags: [],
  IgnoreClick: false,
  IsComparing: false,
  IsSavedDiagram: false,
  Menu: {
    Offset: 284,
    Open: false,
  },
  PinchZoom: {
    Distance: 0,
    X1: 0,
    Y1: 0,
    X2: 0,
    Y2: 0,
  },
  Pointer: {
    IgnoreMove: true,
    Moved: false,
    TouchCount: 0,
    X: 0,
    Y: 0,
  },
  SavedDiagramTitle: 'untitled',
  Scroll: {
    StartLeft: 0,
    StartTop: 0,
  },
  Svg: {
    Node: undefined,
    StartWidth: 0,
    StartHeight: 0,
    NativeWidth: 0,
    NativeHeight: 0,
    RatioX: 0,
    RatioY: 0,
  },
  Zoom: {
    Level: 100,
    Trigger: false,
  },
};

/** Sets the Data.Edit.HasEdits flag based on the state variable and updates
 *  the menu-save button and document.title. */
function hasEdits(state) {
  if (!Data.Edit.HasEdits && state) {
    Data.Edit.HasEdits = true;
    document.getElementById('menu-save').classList.add('changes');
    document.title += ' *';
  } else if (Data.Edit.HasEdits && !state) {
    Data.Edit.HasEdits = false;
    document.getElementById('menu-save').classList.remove('changes');
    if (document.title.endsWith(' *')) {
      document.title = document.title.slice(0, -2);
    }
  }
}

/** Converts the SVG Tag into XML. */
function getSvgXml() {
  return new XMLSerializer().serializeToString(Data.Svg.Node);
}

/** Inject the Highlight Style block into the SVG tag. */
function injectHighlightStyles() {
  const oldStyleTag = Data.Svg.Node.getElementById(STYLE_ID);
  if (oldStyleTag) Data.Svg.Node.removeChild(oldStyleTag);

  // TODO: Make these configurable?
  const drawColour = Data.Colours[0]; // ${drawColour}
  const drawWidth = '5px'; // ${drawWidth}
  const textColour = Data.Colours[0]; // ${textColour}
  const textSize = '2.5em'; // ${textSize}
  const textWeight = 'bold'; // ${textWeight}
  const textFontFamily = 'Arial'; // ${textFontFamily}

  const styleTag = document.createElement('style');
  styleTag.id = STYLE_ID;

  styleTag.textContent = `.${HIGH_CLASS_1}{fill:${Settings.Highlight1};}
.${HIGH_CLASS_2}{fill:${Settings.Highlight2};}
.${HIGH_CLASS_3}{fill:${Settings.Highlight3};}
.${DRAW_CLASS}{stroke:${drawColour};stroke-width:${drawWidth};\
stroke-linecap:round;stroke-linejoin:round;fill-opacity:25%;}
.${TEXT_CLASS}{fill:${textColour};font-family:${textFontFamily};\
font-size:${textSize};font-weight:${textWeight};}`;

  Data.Svg.Node.appendChild(styleTag);
}

/** Clears all highlight classes from the current diagram SVG. */
function clearAllHighlights() {
  const highlight1 = Data.Svg.Node.getElementsByClassName(HIGH_CLASS_1);
  for (const element of Array.from(highlight1)) {
    element.classList.remove(HIGH_CLASS_1);
  }

  const highlight2 = Data.Svg.Node.getElementsByClassName(HIGH_CLASS_2);
  for (const element of Array.from(highlight2)) {
    element.classList.remove(HIGH_CLASS_2);
  }

  const highlight3 = Data.Svg.Node.getElementsByClassName(HIGH_CLASS_3);
  for (const element of Array.from(highlight3)) {
    element.classList.remove(HIGH_CLASS_3);
  }

  if (highlight1.length !== 0 ||
    highlight2.length !== 0 ||
    highlight3.length !== 0) {
    hasEdits(true);
  }
}

/** Returns a highlight target inside the SVG given the starting element. */
function findHighlightTarget(start) {
  let target = start;

  while (target.nodeName === 'tspan') target = target.parentNode;
  if (target.nodeName === 'text') target = target.parentNode;
  if (target.nodeName === 'g' || target.nodeName === 'a') {
    let children = target.getElementsByTagName('rect');
    if (children.length === 0) {
      children = target.getElementsByTagName('path');
    }
    if (children.length === 0) {
      return undefined;
    }

    target = children.item(0);
  }

  return (
    target.nodeName === 'rect' ||
    target.nodeName === 'path' ||
    target.nodeName === 'circle' ||
    target.nodeName === 'ellipse') ? target : undefined;
}

/** Sizes the SVG image to fit according the user preferred Zoom option. */
function resizeSvg() {
  var scale;
  switch (Settings.Zoom) {
    case 'Fit':
      scale = Math.min(
        window.innerWidth / Data.Svg.NativeWidth,
        window.innerHeight / Data.Svg.NativeHeight);
      break;

    case 'Fit Width':
      scale = window.innerWidth / Data.Svg.NativeWidth;
      break;

    case 'Fit Height':
      scale = window.innerHeight / Data.Svg.NativeHeight;
      break;

    case 'Fill':
      scale = Math.max(
        window.innerWidth / Data.Svg.NativeWidth,
        window.innerHeight / Data.Svg.NativeHeight);
      break;

    case 'Original':
      scale = 1;
      break;

    default:
      throw 'Unexpected Zoom setting: ' + Settings.Zoom;
  }

  Data.Svg.StartWidth = Data.Svg.NativeWidth * scale;
  Data.Svg.StartHeight = Data.Svg.NativeHeight * scale;

  // Zoom
  Data.Svg.Node.style.width = Data.Svg.StartWidth.toFixed(0) + 'px';
  Data.Svg.Node.style.height = Data.Svg.StartHeight.toFixed(0) + 'px';
  Data.Zoom.Level = 100;

  // Position
  const left = ((window.innerWidth / 2) - (Data.Svg.StartWidth / 2));
  const top = ((window.innerHeight / 2) - (Data.Svg.StartHeight / 2));

  Data.Svg.Node.style.left = left.toFixed(0) + 'px';
  Data.Svg.Node.style.top = top.toFixed(0) + 'px';

  // Ratio data
  Data.Svg.RatioX = Data.Svg.StartWidth / Data.Svg.NativeWidth;
  Data.Svg.RatioY = Data.Svg.StartHeight / Data.Svg.NativeHeight;
}

/** Resets the position of the diagram to the centre of the screen. */
function resetSvgPosition() {
  const svgWidth = parseFloat(Data.Svg.Node.style.width);
  const left = (window.innerWidth / 2) - (svgWidth / 2);
  Data.Svg.Node.style.left = left.toFixed(0) + 'px';

  const svgHeight = parseFloat(Data.Svg.Node.style.height);
  const top = (window.innerHeight / 2) - (svgHeight / 2);
  Data.Svg.Node.style.top = top.toFixed(0) + 'px';
}

/** Apply the highlighter to the click event target. */
function applyHighlightOnClick(event) {
  const target = findHighlightTarget(event.target);
  if (!target) return;

  // Toggle the highlight
  if (target.classList.contains(HIGH_CLASS_1)) {
    target.classList.remove(HIGH_CLASS_1);
  } else if (target.classList.contains(HIGH_CLASS_2)) {
    target.classList.remove(HIGH_CLASS_2);
  } else if (target.classList.contains(HIGH_CLASS_3)) {
    target.classList.remove(HIGH_CLASS_3);
  } else if (event.ctrlKey) {
    target.classList.add(HIGH_CLASS_3);
  } else if (event.shiftKey) {
    target.classList.add(HIGH_CLASS_2);
  } else {
    target.classList.add(HIGH_CLASS_1);
  }

  hasEdits(true);
}

/** Prompt the user for text to create a text label with. */
function addTextOnClick() {
  modalPrompt('Add text to diagram', '', function addTextModalOK() {
    let textContent = getModalInputText();
    if (textContent) textContent = textContent.trim();
    if (textContent) {
      const x = (Data.Pointer.X - parseFloat(Data.Svg.Node.style.left)) /
        Data.Svg.RatioX;
      const y = (Data.Pointer.Y - parseFloat(Data.Svg.Node.style.top)) /
        Data.Svg.RatioY;

      var text = document.createElementNS(SVG_NAMESPACE, 'text');
      text.setAttribute('class', TEXT_CLASS);
      text.setAttribute('transform',
        `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
      text.textContent = textContent;
      Data.Svg.Node.appendChild(text);

      hasEdits(true);
    }
  });
}

/** Cycle through the sequence in Data.Colours. */
function cycleColour(colour) {
  let index = Data.Colours.indexOf(colour);
  if (index === -1) index = 0;
  index = (index + 1) % Data.Colours.length;
  return Data.Colours[index];
}

/** Cycle the colour of the Draw Node. */
function cycleDrawColour() {
  Data.Edit.Node.style.stroke = cycleColour(Data.Edit.Node.style.stroke);
  hasEdits(true);
}

/** Cycle the colour of the Text Node. */
function cycleTextColour() {
  Data.Edit.Node.style.fill = cycleColour(Data.Edit.Node.style.fill);
  hasEdits(true);
}

/** Handles mouse middle button click events. */
function auxClickEvent(event) {
  if (event.button !== Mouse.Button.Right) return;

  if (Data.IgnoreClick) return;

  switch (Data.Edit.Mode) {
    case EditModes.Draw:
      if (event.target.classList.contains(DRAW_CLASS)) {
        event.target.remove();
        hasEdits(true);
      }
      break;

    case EditModes.Highlight:
      clearAllHighlights();
      break;

    case EditModes.Text:
      if (event.target.classList.contains(TEXT_CLASS)) {
        event.target.remove();
        hasEdits(true);
      }
      break;

    default:
      resizeSvg();
      break;
  }

  event.preventDefault();
}

/** Handles mouse left click event for highlighting. */
function clickSvgEvent(event) {
  if (Data.IgnoreClick) {
    event.preventDefault();
    return;
  }

  switch (Data.Edit.Mode) {
    case EditModes.Highlight:
      applyHighlightOnClick(event);
      event.preventDefault();
      break;

    case EditModes.Draw:
      if (Data.Edit.Node) {
        cycleDrawColour();
      }
      event.preventDefault();
      break;

    case EditModes.Text:
      if (Data.Edit.Node) {
        cycleTextColour();
      } else {
        addTextOnClick();
      }
      event.preventDefault();
      break;
  }
}

/** Determines if the given element is a descendant of a tag name supplied. */
function isDescendantOf(element, tagName) {
  const tagNameTarget = tagName.toUpperCase();

  for (let node = element; node && node != document; node = node.parentNode) {
    if (node.tagName.toUpperCase() === tagNameTarget) return true;
  }

  return false;
}

/** Create transform attribute for an SVG node. */
function updateTransform() {
  const transforms = [];

  if (Data.Edit.Transform.Translate.X !== 0 ||
    Data.Edit.Transform.Translate.Y !== 0) {
    transforms.push(`translate(${Data.Edit.Transform.Translate.X.toFixed(1)} \
${Data.Edit.Transform.Translate.Y.toFixed(1)})`);
  }

  if (Data.Edit.Transform.Rotate !== 0) {
    transforms.push(`rotate(${Data.Edit.Transform.Rotate.toFixed(1)})`);
  }

  if (Data.Edit.Transform.Scale !== 1) {
    transforms.push(`scale(${Data.Edit.Transform.Scale.toFixed(2)})`);
  }

  Data.Edit.Node.setAttribute('transform', transforms.join(' '));
}

/** Parse the transform attribute of an SVG Node and return data object. */
function parseTransform(svgNode) {
  Data.Edit.Transform.Translate.X = 0;
  Data.Edit.Transform.Translate.Y = 0;
  Data.Edit.Transform.Rotate = 0;
  Data.Edit.Transform.Scale = 1;

  const value = svgNode.getAttribute('transform');
  if (!value) return;

  const components = value.split(/\(|\s|\)/);
  for (let index = 0; index < components.length; index++) {
    switch (components[index]) {
      case 'translate':
        Data.Edit.Transform.Translate.X = parseFloat(components[++index]);
        Data.Edit.Transform.Translate.Y = parseFloat(components[++index]);
        break;

      case 'rotate':
        Data.Edit.Transform.Rotate = parseFloat(components[++index]);
        break;

      case 'scale':
        Data.Edit.Transform.Scale = parseFloat(components[++index]);
        break;
    }
  }
}

/** Handles the pointer down event. */
function pointerDown(target, x, y, ctrlKey, shiftKey) {
  if (target !== document.body && !isDescendantOf(target, 'svg')) return;

  Data.Pointer.IgnoreMove = false;
  Data.Pointer.Moved = false;
  Data.Pointer.X = x;
  Data.Pointer.Y = y;

  Data.Scroll.StartLeft = parseFloat(Data.Svg.Node.style.left);
  Data.Scroll.StartTop = parseFloat(Data.Svg.Node.style.top);
  Data.Edit.Node = undefined;
  Data.Action.Type = undefined;

  switch (Data.Edit.Mode) {
    case EditModes.Draw:
      if (target.classList.contains(DRAW_CLASS)) {
        Data.Edit.Node = target;
        parseTransform(target);
        const bbox = target.getBBox();
        Data.Edit.Centre.X = bbox.x + (bbox.width / 2);
        Data.Edit.Centre.Y = bbox.y + (bbox.height / 2);

        // if (ctrlKey) {
        //   Data.Action.Type = Actions.Resize;
        // } else if (shiftKey) {
        //   Data.Action.Type = Actions.Rotate;
        // } else {
        Data.Action.Type = Actions.Move;
        Data.Pointer.X -= Data.Edit.Transform.Translate.X * Data.Svg.RatioX;
        Data.Pointer.Y -= Data.Edit.Transform.Translate.Y * Data.Svg.RatioY;
        // }
      } else {
        Data.IgnoreClick = true;
        Data.Action.Type = Actions.Add;
      }
      break;

    case EditModes.Text:
      if (target.classList.contains(TEXT_CLASS)) {
        Data.Edit.Node = target;
        parseTransform(target);
        const bbox = target.getBBox();
        Data.Edit.Centre.X = bbox.x + (bbox.width / 2);
        Data.Edit.Centre.Y = bbox.y + (bbox.height / 2);

        if (ctrlKey) {
          Data.Action.Type = Actions.Resize;
        } else if (shiftKey) {
          Data.Action.Type = Actions.Rotate;
        } else {
          Data.Action.Type = Actions.Move;
          Data.Pointer.X -= Data.Edit.Transform.Translate.X * Data.Svg.RatioX;
          Data.Pointer.Y -= Data.Edit.Transform.Translate.Y * Data.Svg.RatioY;
        }
      }
      break;
  }
}

/** Sets drag, paint, and scroll reference data on left button and ignores
 * other button events. */
function mouseDown(event) {
  Data.IgnoreClick = false;

  if (event.buttons === Mouse.Buttons.Left) {
    Data.Pointer.IgnoreMove = true;

    pointerDown(
      event.target,
      event.clientX,
      event.clientY,
      event.ctrlKey,
      event.shiftKey);
  } else if (event.buttons === Mouse.Buttons.Right) {
    Data.Pointer.IgnoreMove = false;
  }
}

/** Handles paint events in Draw Mode. */
function drawModePaint(x, y, ctrlKey, shiftKey) {
  // A mathematically simple estimation of distance moved
  if (Math.abs(x - Data.Pointer.X) + Math.abs(y - Data.Pointer.Y) < 4) return;

  if (!Data.Action.Active) {
    document.body.classList.add('drawing');
    Data.Action.Active = true;
    Data.IgnoreClick = true;
    hasEdits(true);
  }

  const left = parseFloat(Data.Svg.Node.style.left);
  const top = parseFloat(Data.Svg.Node.style.top);

  if (!Data.Edit.Node) {
    const startX = (Data.Pointer.X - left) / Data.Svg.RatioX;
    const startY = (Data.Pointer.Y - top) / Data.Svg.RatioY;
    var path = document.createElementNS(SVG_NAMESPACE, 'path');
    path.setAttribute('class', DRAW_CLASS);
    path.setAttribute('d', `M${startX.toFixed(1)} ${startY.toFixed(1)}`);
    Data.Svg.Node.appendChild(path);

    Data.Edit.Node = path;
  }

  const x2 = (x - left) / Data.Svg.RatioX;
  const y2 = (y - top) / Data.Svg.RatioY;

  if (ctrlKey) {
    const index = Data.Edit.Node.attributes['d'].value.lastIndexOf('L');
    if (index !== -1) {
      Data.Edit.Node.attributes['d'].value =
        Data.Edit.Node.attributes['d'].value.slice(0, index);
    }
  }

  if (Data.Edit.Node.attributes['d'].value.endsWith('Z')) {
    Data.Edit.Node.attributes['d'].value =
      Data.Edit.Node.attributes['d'].value.slice(0, -1);
  }

  Data.Edit.Node.attributes['d'].value += `L${x2.toFixed(1)} ${y2.toFixed(1)}`;

  if (shiftKey) {
    Data.Edit.Node.attributes['d'].value += 'Z';
  }

  Data.Pointer.X = x;
  Data.Pointer.Y = y;
}

/** Processes a scroll mouse move. Scrolls based on fixed start position. */
function scrollMove(x, y) {
  if (!Data.Action.Active) {
    document.body.classList.add('scrolling');
    Data.Action.Type = Actions.Scroll;
    Data.Action.Active = true;
    Data.IgnoreClick = true;
  }

  const left = (Data.Scroll.StartLeft - Data.Pointer.X + x).toFixed(0);
  Data.Svg.Node.style.left = left + 'px';

  const top = (Data.Scroll.StartTop - Data.Pointer.Y + y).toFixed(0);
  Data.Svg.Node.style.top = top + 'px';
}

/** Translate the position of the current Edit Node. */
function translateNode(x, y) {
  if (!Data.Action.Active) {
    document.body.classList.add('moving');
    Data.Action.Type = Actions.Move;
    Data.Action.Active = true;
    Data.IgnoreClick = true;
    hasEdits(true);
  }

  Data.Edit.Transform.Translate.X = (x - Data.Pointer.X) / Data.Svg.RatioX;
  Data.Edit.Transform.Translate.Y = (y - Data.Pointer.Y) / Data.Svg.RatioY;

  updateTransform();
}

/** Rotate the current Edit Node. */
function rotateNode(x, y) {
  if (!Data.Action.Active) {
    document.body.classList.add('rotating');
    Data.Action.Type = Actions.Rotate;
    Data.Action.Active = true;
    Data.IgnoreClick = true;
    hasEdits(true);
  }

  const dx = ((x - parseFloat(Data.Svg.Node.style.left)) / Data.Svg.RatioX) -
    Data.Edit.Transform.Translate.X;
  const dy = ((y - parseFloat(Data.Svg.Node.style.top)) / Data.Svg.RatioY) -
    Data.Edit.Transform.Translate.Y;

  Data.Edit.Transform.Rotate = Math.atan(dy / dx) * 180 / Math.PI;
  if (dx < 0) Data.Edit.Transform.Rotate += 180;

  updateTransform();
}

/** Scale the current Edit Node. */
function resizeNode(y) {
  if (!Data.Action.Active) {
    document.body.classList.add('resizing');
    Data.Action.Type = Actions.Resize;
    Data.Action.Active = true;
    Data.IgnoreClick = true;
    Data.Edit.Transform.StartScale = Data.Edit.Transform.Scale;
    hasEdits(true);
  }

  const maxDelta = Data.Pointer.Y;
  const minDelta = -window.innerHeight - Data.Pointer.Y;

  const scaleUp = (15 - Data.Edit.Transform.StartScale) / maxDelta;
  const scaleDown = (0.05 - Data.Edit.Transform.StartScale) / minDelta;

  let delta = Data.Pointer.Y - y;
  if (delta > maxDelta) delta = maxDelta;
  if (delta < minDelta) delta = minDelta;

  Data.Edit.Transform.Scale = Data.Edit.Transform.StartScale;

  if (Math.abs(delta) > 3) {
    Data.Edit.Transform.Scale += delta * (delta > 0 ? scaleUp : scaleDown);
  }

  updateTransform();
}

/** Handles pointer movement. */
function pointerMove(x, y, ctrlKey, shiftKey) {
  switch (Data.Edit.Mode) {
    case EditModes.Off: scrollMove(x, y); break;
    case EditModes.Highlight: scrollMove(x, y); break;

    case EditModes.Draw:
      switch (Data.Action.Type) {
        case Actions.Add: drawModePaint(x, y, ctrlKey, shiftKey); break;
        case Actions.Move: translateNode(x, y); break;
        // case Actions.Rotate: rotateNode(x, y); break;
        // case Actions.Resize: resizeNode(y); break;
      }
      break;

    case EditModes.Text:
      switch (Data.Action.Type) {
        case Actions.Move: translateNode(x, y); break;
        case Actions.Rotate: rotateNode(x, y); break;
        case Actions.Resize: resizeNode(y); break;
        default: scrollMove(x, y); break;
      }
      break;
  }
}

/** Removes highlights from the target node. */
function deleteHighlights(target) {
  const node = findHighlightTarget(target);
  if (!node) return;

  if (node.classList.includes(HIGH_CLASS_1)) {
    node.classList.remove(HIGH_CLASS_1);
    hasEdits(true);
  } else if (node.classList.includes(HIGH_CLASS_2)) {
    node.classList.remove(HIGH_CLASS_2);
    hasEdits(true);
  } else if (node.classList.includes(HIGH_CLASS_3)) {
    node.classList.remove(HIGH_CLASS_3);
    hasEdits(true);
  }
}

/** Handles the eraser action for the target node. */
function eraserMove(target) {
  if (!Data.Action.Active) {
    document.body.classList.add('erasing');
    Data.Action.Type = Actions.Erase;
    Data.Action.Active = true;
    Data.IgnoreClick = true;
  }

  switch (Data.Edit.Mode) {
    case EditModes.Highlight:
      deleteHighlights(target);
      break;

    case EditModes.Draw:
      if (target.classList.contains(DRAW_CLASS)) {
        target.remove();
        hasEdits(true);
      }
      break;

    case EditModes.Text:
      if (target.classList.contains(TEXT_CLASS)) {
        target.remove();
        hasEdits(true);
      }
      break;
  }
}

/** Performs drag to scroll events for left button and ignores non-movement. */
function mouseMove(event) {
  if (!Data.Pointer.Moved) {
    if (Data.Pointer.X !== event.clientX || Data.Pointer.Y !== event.clientY) {
      Data.Pointer.Moved = true;
    } else {
      return;
    }
  }

  if (Data.Pointer.IgnoreMove) return;

  if (event.buttons === Mouse.Buttons.Left) {
    pointerMove(event.clientX, event.clientY, event.ctrlKey, event.shiftKey);
  } else if (event.buttons === Mouse.Buttons.Right &&
    Data.Edit.Mode !== EditModes.Off) {
    eraserMove(event.target);
  }
}

/** Timer fires regularly to act on zoom instructions, taking the action off
 *  the even listener. */
function zoomTimer() {
  if (!Data.Zoom.Trigger) return;
  Data.Zoom.Trigger = false;

  const prevWidth = parseFloat(Data.Svg.Node.style.width);
  const prevHeight = parseFloat(Data.Svg.Node.style.height);

  const newWidth = Data.Svg.StartWidth * Data.Zoom.Level / 100;
  const newHeight = Data.Svg.StartHeight * Data.Zoom.Level / 100;

  Data.Svg.Node.style.width = newWidth.toFixed(0) + 'px';
  Data.Svg.Node.style.height = newHeight.toFixed(0) + 'px';

  Data.Svg.RatioX = newWidth / Data.Svg.NativeWidth;
  Data.Svg.RatioY = newHeight / Data.Svg.NativeHeight;

  // Move the image keep it centred about the pointer position
  const originX = parseFloat(Data.Svg.Node.style.left);
  const originY = parseFloat(Data.Svg.Node.style.top);

  const scaleX = newWidth / prevWidth;
  const scaleY = newHeight / prevHeight;

  const relativeX = Data.Pointer.X - originX;
  const relativeY = Data.Pointer.Y - originY;

  const deltaX = (relativeX * scaleX) - relativeX;
  const deltaY = (relativeY * scaleY) - relativeY;

  const top = originY - deltaY;
  const left = originX - deltaX;

  Data.Svg.Node.style.top = top.toFixed(0) + 'px';
  Data.Svg.Node.style.left = left.toFixed(0) + 'px';
}

/** Apply the zoom step with checks and balances on limits and zoom level. */
function applyZoomStep(step) {
  // Use smaller step sizes when zoomed less than 100%
  if (Data.Zoom.Level < 100) {
    step = step / 4;
  } else if (Data.Zoom.Level === 100) {
    if (step < 0) {
      step = step / 4;
    }
  }

  Data.Zoom.Level += step;

  if (Data.Zoom.Level > 1000) Data.Zoom.Level = 1000;
  else if (Data.Zoom.Level < 10) Data.Zoom.Level = 10;

  Data.Zoom.Trigger = true;
}

/** Intercepts the mouse wheel event and uses it to zoom in/out on SVG (when
  * present). */
function wheelEvent(event) {
  event.preventDefault();

  if (Data.Action.Active) return;
  if (Math.abs(event.deltaY) < 0.1) return;

  Data.Pointer.X = event.clientX;
  Data.Pointer.Y = event.clientY;

  applyZoomStep(event.deltaY > 0 ? -ZOOM_STEP_SIZE : ZOOM_STEP_SIZE);
}

/** Zoom based on a key press. */
function zoomKey(step) {
  Data.Pointer.X = window.innerWidth / 2;
  Data.Pointer.Y = window.innerHeight / 2;

  applyZoomStep(step);
}

/** Move the diagram coordinates to simulate a scroll based on the x and y
 *  step sizes supplied */
function scrollStep(x, y) {
  if (x !== 0) {
    const originX = parseFloat(Data.Svg.Node.style.left);
    const deltaX = window.innerHeight * x;
    const left = originX - deltaX;
    Data.Svg.Node.style.left = left.toFixed(0) + 'px';
  }
  if (y !== 0) {
    const originY = parseFloat(Data.Svg.Node.style.top);
    const deltaY = window.innerWidth * y;
    const top = originY - deltaY;
    Data.Svg.Node.style.top = top.toFixed(0) + 'px';
  }
}

/** Act on key presses for zooming. */
function keyUpEvent(event) {
  if (event.target !== document.body) return;
  if (Data.Action.Active) return;

  switch (event.key) {
    case '+':
      zoomKey(ZOOM_STEP_SIZE);
      event.preventDefault();
      break;

    case '-':
      zoomKey(-ZOOM_STEP_SIZE);
      event.preventDefault();
      break;

    case '=':
      resizeSvg();
      event.preventDefault();
      break;

    case 'ArrowUp':
      scrollStep(0, -SCROLL_STEP_SIZE);
      event.preventDefault();
      break;

    case 'ArrowDown':
      scrollStep(0, SCROLL_STEP_SIZE);
      event.preventDefault();
      break;

    case 'ArrowLeft':
      scrollStep(-SCROLL_STEP_SIZE, 0);
      event.preventDefault();
      break;

    case 'ArrowRight':
      scrollStep(SCROLL_STEP_SIZE, 0);
      event.preventDefault();
      break;

    case 'Enter':
      resetSvgPosition();
      event.preventDefault();
      break;
  }
}

/** Adds custom tooltips to the individual tiles of the current diagram. */
// function addTooltips() {
//   const tooltipText = [
//     { text: 'Microsoft 365 E3', description: 'Microsoft 365 E3' },
//     { text: 'Self-Service Password Reset in AD', description: 'Self-Service Password Reset in AD' }
//   ];

//   const links = Data.Svg.Node.getElementsByTagName('a');
//   Array.from(links).forEach(function forEachLink(link) {
//     const texts = link.getElementsByTagName('text');
//     if (texts.length === 1) {
//       const text = texts[0].textContent;
//       const tooltip = tooltipText.find(item => item.text === text);
//       if (tooltip) {
//         link.dataset.tooltip = tooltip.description;
//         // link.addEventListener('mouseover', () => {
//         //   mouseOverCallback(tooltip.description);
//         // });
//         //   link.addEventListener('mouseout', () => {
//         // });
//       }
//     }
//   });
// }

/** Handles the window size change event. Could be an orientation change. */
function windowResize() {
  resizeSvg();
  setMenuPosition();
}

/** Applies pinch zoom based on coordinates of two fingers. */
function pinchZoom(x1, y1, x2, y2) {
  const newDistance = Math.abs(x1 - x2) + Math.abs(y1 - y2);
  const delta = newDistance - Data.PinchZoom.Distance;
  if (Math.abs(delta) < 0.1) return;

  Data.IgnoreClick = true;

  // Centre the pointer position between the two pinch points.
  Data.Pointer.X = x1 + ((x2 - x1) / 2);
  Data.Pointer.Y = y1 + ((y2 - y1) / 2);

  applyZoomStep(delta);

  Data.PinchZoom.X1 = x1;
  Data.PinchZoom.Y1 = y1;
  Data.PinchZoom.X2 = x2;
  Data.PinchZoom.Y2 = y2;
  Data.PinchZoom.Distance = newDistance;
}

/** Handles the touch start event for either 1 or 2 finger touch events. */
function touchStart(event) {
  if (Data.Pointer.TouchCount === 0 && event.touches.length === 1) {
    // 0 -> 1 touch transition

    Data.IgnoreClick = false;
    Data.Pointer.IgnoreMove = true;

    pointerDown(
      event.touches[0].target,
      event.touches[0].clientX,
      event.touches[0].clientY,
      event.ctrlKey,
      event.shiftKey);

    Data.Pointer.TouchCount = 1;
  } else if (Data.Pointer.TouchCount < 2 && event.touches.length === 2) {
    // 0 or 1 -> 2 touches transition

    Data.IgnoreClick = false;

    // 1 -> 2 touches transition
    if (Data.Pointer.TouchCount === 1) {
      pointerUp(event);
    }

    Data.PinchZoom.X1 = event.touches[0].clientX;
    Data.PinchZoom.Y1 = event.touches[0].clientY;
    Data.PinchZoom.X2 = event.touches[1].clientX;
    Data.PinchZoom.Y2 = event.touches[1].clientY;
    Data.PinchZoom.Distance =
      Math.abs(Data.PinchZoom.X1 - Data.PinchZoom.X2) +
      Math.abs(Data.PinchZoom.Y1 - Data.PinchZoom.Y2);

    Data.Pointer.TouchCount = 2;
  } else if (Data.Pointer.TouchCount !== 0) {
    // Any other touch count transition
    pointerUp(event);
  }
}

/** Handles the touch move event. */
function touchMove(event) {
  if (event.touches.length === 1 && Data.Pointer.TouchCount === 1) {
    pointerMove(
      event.touches[0].clientX,
      event.touches[0].clientY,
      event.ctrlKey,
      event.shiftKey);
  } else if (event.touches.length === 2 && Data.Pointer.TouchCount === 2) {
    pinchZoom(
      event.touches[0].clientX,
      event.touches[0].clientY,
      event.touches[1].clientX,
      event.touches[1].clientY);
  }
}

/** Handles the touch end and mouse up events. */
function pointerUp() {
  if (Data.Action.Active) {
    document.body.classList.remove('moving');
    document.body.classList.remove('drawing');
    document.body.classList.remove('erasing');
    document.body.classList.remove('resizing');
    document.body.classList.remove('rotating');
    document.body.classList.remove('scrolling');
    Data.Action.Active = false;
  }

  Data.Pointer.TouchCount = 0;
}

/** Register the SVG related event handlers. */
function registerSvgEvents() {
  // SVG Click event
  Data.Svg.Node.addEventListener('click', clickSvgEvent);

  // Capture right click / other click event
  window.addEventListener('auxclick', auxClickEvent);

  // Mouse actions for scrolling, drawing, and moving text
  window.addEventListener('mousedown', mouseDown);
  window.addEventListener('mouseup', pointerUp);
  window.addEventListener('mousemove', mouseMove);

  // Touch actions for scrolling, drawing, and moving text
  window.addEventListener("touchstart", touchStart);
  window.addEventListener("touchend", pointerUp);
  window.addEventListener("touchmove", touchMove);

  // Key presses for zooming / reset zoom
  window.addEventListener('keyup', keyUpEvent);

  // Listen for the scroll wheel for zooming
  window.addEventListener('wheel', wheelEvent, { passive: false });

  // Detect window resize events (coud be an orientation change!)
  window.addEventListener('resize', windowResize);

  // Setup timer function for zooming actions outside the event listener
  setInterval(zoomTimer, 100);
}

/** Handles the user clicking the menu Flag item. */
function flagClick() {
  if (Data.Flags.includes(Data.Filename)) {
    const flagIndex = Data.Flags.indexOf(Data.Filename);
    if (flagIndex > -1) Data.Flags.splice(flagIndex, 1);
  } else {
    Data.Flags.push(Data.Filename);
  }

  localStorage.setItem(StoreName.Flags, JSON.stringify(Data.Flags));

  updateMenuFlag();
}

/** Load IsFlagged diagrms list from local storage. */
function loadFlags() {
  const flagsJSON = localStorage.getItem(StoreName.Flags);
  if (flagsJSON) {
    const flags = JSON.parse(flagsJSON);
    if (flags) {
      Data.Flags = flags;
    }
  }
}

/** Read the filter values from the existing filter style on the SVG tag. */
function readFilterValuesfromSvg() {
  const filters = Data.Svg.Node.style.filter;
  if (filters === '') return false;

  const bIndex = filters.indexOf('brightness');
  const cIndex = filters.indexOf('contrast');
  const hIndex = filters.indexOf('hue-rotate');
  const sIndex = filters.indexOf('saturate');

  const bString = getStringBetween(filters, bIndex, '(', ')');
  const cString = getStringBetween(filters, cIndex, '(', ')');
  const hString = getStringBetween(filters, hIndex, '(', 'deg');
  const sString = getStringBetween(filters, sIndex, '(', ')');

  if (bString) Data.Controls.Brightness.value = bString * 10;
  if (cString) Data.Controls.Contrast.value = cString * 10;
  if (hString) Data.Controls.Hue.value = hString;
  if (sString) Data.Controls.Saturation.value = sString * 10;

  return true;
}

/** Update the SVG filter CSS based on changes to the image controls. */
function filterChange() {
  Data.Svg.Node.style.filter = getFiltersCss(
    Data.Controls.Brightness.value,
    Data.Controls.Contrast.value,
    Data.Controls.Hue.value,
    Data.Controls.Saturation.value);
}

/** Handles the user clicking the image controls menu reset button. */
function imageControlsResetClick() {
  Data.Controls.Brightness.value =
    Data.Controls.Brightness.defaultValue;
  Data.Controls.Contrast.value =
    Data.Controls.Contrast.defaultValue;
  Data.Controls.Hue.value =
    Data.Controls.Hue.defaultValue;
  Data.Controls.Saturation.value =
    Data.Controls.Saturation.defaultValue;

  filterChange();
}

/** Handles the user clicking the image controls menu save button. */
function imageControlsSaveClick() {
  Settings.Filters.Brightness = Data.Controls.Brightness.value;
  Settings.Filters.Contrast = Data.Controls.Contrast.value;
  Settings.Filters.Hue = Data.Controls.Hue.value;
  Settings.Filters.Saturation = Data.Controls.Saturation.value;

  saveSettings();

  Data.Controls.Open = false;
  setControlsPosition();
}

/** Sets the image controls panel position based on Data.Controls.Open. */
function setControlsPosition() {
  const menu = document.getElementById('menu');
  const filters = document.getElementById('image-controls');

  const top =
    Data.Controls.Open ? menu.clientHeight : -filters.clientHeight - 2;

  filters.style.top = top + 'px';
}

/** Set values and attach event listeners to image control elements. */
function setupImageControls() {
  Data.Controls.Brightness = document.getElementById('brightness');
  Data.Controls.Contrast = document.getElementById('contrast');
  Data.Controls.Hue = document.getElementById('hue');
  Data.Controls.Saturation = document.getElementById('saturation');

  Data.Controls.Brightness.value = Settings.Filters.Brightness;
  Data.Controls.Contrast.value = Settings.Filters.Contrast;
  Data.Controls.Hue.value = Settings.Filters.Hue;
  Data.Controls.Saturation.value = Settings.Filters.Saturation;

  Data.Controls.Brightness.addEventListener('input', filterChange);
  Data.Controls.Contrast.addEventListener('input', filterChange);
  Data.Controls.Hue.addEventListener('input', filterChange);
  Data.Controls.Saturation.addEventListener('input', filterChange);

  document.getElementById('image-controls-reset').
    addEventListener('click', imageControlsResetClick);
  document.getElementById('image-controls-save').
    addEventListener('click', imageControlsSaveClick);
}

/** Updates the visual state of the menu flag button based on IsFlagged. */
function updateMenuFlag() {
  const menuFlag = document.getElementById('menu-flag');
  if (menuFlag) {
    if (Data.Flags.includes(Data.Filename)) {
      menuFlag.title = 'Remove flag';
      menuFlag.className = 'flagged';
    } else {
      menuFlag.title = 'Flag this diagram';
      menuFlag.className = 'unflagged';
    }
  }
}

/** Enable or Disable the menu download buttons depending on online status. */
function updateDownloadButtonState() {
  const menuDownloadPdf = document.getElementById('menu-download-pdf');
  const menuDownloadPng = document.getElementById('menu-download-png');

  if (navigator.onLine) {
    if (menuDownloadPdf) menuDownloadPdf.disabled = false;
    if (menuDownloadPng) menuDownloadPng.disabled = false;
  } else {
    if (menuDownloadPdf) menuDownloadPdf.disabled = true;
    if (menuDownloadPng) menuDownloadPng.disabled = true;
  }
}

/** Updates all data on the Menu elements and sets the size and offset data. */
function updateMenu() {
  const menuExportSvg = document.getElementById('menu-export-svg');
  const menuExportPng = document.getElementById('menu-export-png');
  const menuDownloadPdf = document.getElementById('menu-download-pdf');
  const menuDownloadPng = document.getElementById('menu-download-png');

  switch (Data.Edit.Mode) {
    case EditModes.Off:
      Data.Svg.Node.classList.remove('edit-mode');
      Data.Svg.Node.classList.remove('draw-mode');
      Data.Svg.Node.classList.remove('highlight-mode');
      Data.Svg.Node.classList.remove('text-mode');

      document.getElementById('menu-edit').style.display = 'inline-block';
      document.getElementById('menu-highlight').style.display = 'none';
      document.getElementById('menu-draw').style.display = 'none';
      document.getElementById('menu-text').style.display = 'none';

      if (!Data.IsSavedDiagram) {
        if (menuExportSvg) menuExportSvg.style.display = 'none';
        if (menuExportPng) menuExportPng.style.display = 'none';
      }

      if (menuDownloadPdf) menuDownloadPdf.style.display = 'inline-block';
      if (menuDownloadPng) menuDownloadPng.style.display = 'inline-block';

      updateDownloadButtonState();
      break;

    case EditModes.Draw:
      Data.Svg.Node.classList.add('draw-mode');
      Data.Svg.Node.classList.remove('highlight-mode');
      Data.Svg.Node.classList.remove('text-mode');

      document.getElementById('menu-edit').style.display = 'none';
      document.getElementById('menu-highlight').style.display = 'none';
      document.getElementById('menu-draw').style.display = 'inline-block';
      document.getElementById('menu-text').style.display = 'none';
      break;

    case EditModes.Highlight:
      Data.Svg.Node.classList.remove('draw-mode');
      Data.Svg.Node.classList.add('highlight-mode');
      Data.Svg.Node.classList.remove('text-mode');

      document.getElementById('menu-edit').style.display = 'none';
      document.getElementById('menu-highlight').style.display = 'inline-block';
      document.getElementById('menu-draw').style.display = 'none';
      document.getElementById('menu-text').style.display = 'none';
      break;

    case EditModes.Text:
      Data.Svg.Node.classList.remove('draw-mode');
      Data.Svg.Node.classList.remove('highlight-mode');
      Data.Svg.Node.classList.add('text-mode');

      document.getElementById('menu-edit').style.display = 'none';
      document.getElementById('menu-highlight').style.display = 'none';
      document.getElementById('menu-draw').style.display = 'none';
      document.getElementById('menu-text').style.display = 'inline-block';
      break;
  }

  if (Data.Edit.Mode !== EditModes.Off) {
    Data.Svg.Node.classList.add('edit-mode');

    if (!Data.IsSavedDiagram) {
      if (menuExportSvg) menuExportSvg.style.display = 'inline-block';
      if (menuExportPng) menuExportPng.style.display = 'inline-block';
    }

    if (menuDownloadPdf) menuDownloadPdf.style.display = 'none';
    if (menuDownloadPng) menuDownloadPng.style.display = 'none';
  }
}

/** Sets the menu position, grip title, and grip graphic based on
 *  Data.Menu.Open. */
function setMenuPosition() {
  const menu = document.getElementById('menu');
  const grip = document.getElementById('menu-grip');

  if (Data.Menu.Open) {
    grip.title = 'Close menu';
    grip.className = 'close';

    if (window.innerWidth < 450) {
      menu.style.left = 0;
      menu.style.borderRadius = 0;
    } else {
      menu.style.removeProperty('left');
      menu.style.removeProperty('border-radius');
    }

    menu.style.right = 0;
  } else {
    grip.title = 'Open menu';
    grip.className = 'open';

    if (window.innerWidth < 450) {
      menu.style.removeProperty('left');
      menu.style.removeProperty('border-radius');
    }

    menu.style.right = -Data.Menu.Offset + 'px';
  }
}

/** User clicked the menu grip, toggling the Data.Menu.Open state and
 * redrawing the menu. */
function gripClick() {
  Data.Menu.Open = !Data.Menu.Open;
  setMenuPosition();

  if (!Data.Menu.Open && Data.Controls.Open) {
    Data.Controls.Open = false;
    setControlsPosition();
  }
}

/** Handles the user clicking the menu edit item. */
function menuEditClick() {
  // Cycle through edit modes
  switch (Data.Edit.Mode) {
    case EditModes.Off: Data.Edit.Mode = EditModes.Highlight; break;
    case EditModes.Highlight: Data.Edit.Mode = EditModes.Draw; break;
    case EditModes.Draw: Data.Edit.Mode = EditModes.Text; break;
    case EditModes.Text: Data.Edit.Mode = EditModes.Off; break;
    default: throw `Unexpected Edit Mode: ${Data.Edit.Mode}`;
  }

  updateMenu();
}

/** Handles the user clicking the menu Controls item. */
function menuControlsClick() {
  Data.Controls.Open = !Data.Controls.Open;
  setControlsPosition();
}

/** Save current SVG to local storage using title and key supplied. */
function saveSvg(title, storageKey) {
  const svgXml = getSvgXml();
  const svgObject = { Title: title, SvgXml: svgXml };
  const jsonData = JSON.stringify(svgObject);
  localStorage.setItem(storageKey, jsonData);

  hasEdits(false);
}

/** Handle the OK outcome on the Save Modal Prompt. */
function saveOK(callback) {
  let diagramTitle = getModalInputText();
  if (diagramTitle) diagramTitle = diagramTitle.trim();
  if (diagramTitle) {
    const storageKey = Date.now().toString();
    saveSvg(diagramTitle, storageKey);

    if (callback) {
      callback();
    } else {
      window.location.href = `/viewsvg.htm#*${storageKey}`;
    }
  }
}

/** Handles the Yes outcome on the Overwrite Modal Confirm. */
function overwriteYes(callback) {
  saveSvg(Data.SavedDiagramTitle, Data.Filename);
  if (callback) callback();
}

/** Handles the No outcome on the Overwrite Modal Confirm. */
function overwriteNo(okCallback, cancelCallback) {
  modalPrompt('Save diagram as:', Data.SavedDiagramTitle,
    () => saveOK(okCallback), cancelCallback);
}

/** Process the request to save the diagram. */
function requestSave(yesCallback) {
  if (Data.IsSavedDiagram) {
    modalConfirm('Overwrite existing diagram?',
      () => overwriteYes(yesCallback), () => overwriteNo(yesCallback), () => { });
  } else {
    const diagramTitle = decodeURIComponent(Data.Filename);
    modalPrompt('Save diagram as:', diagramTitle, () => saveOK(yesCallback));
  }
}

/** Handles the user clicking the menu Save item. */
function menuSaveClick() {
  requestSave();
}

/** Handles the user clicking the menu Export SVG item. */
function exportSvgClick() {
  const filename = Data.IsSavedDiagram ?
    Data.SavedDiagramTitle :
    decodeURIComponent(Data.Filename);

  const svgXml = getSvgXml();
  exportSvg(filename + '.svg', svgXml);
}

/** Handles the user clicking the menu Export PNG item. */
function exportPngClick() {
  const filename = Data.IsSavedDiagram ?
    Data.SavedDiagramTitle :
    decodeURIComponent(Data.Filename);

  const svgXml = getSvgXml();
  const background = window.getComputedStyle(document.body).backgroundColor;
  exportPng(filename + '.png', svgXml, background);
}

/** Handles the user clicking the menu back button. */
function backClick() {
  if (Data.Edit.HasEdits) {
    modalConfirm(
      'Would you like to save your changes before leaving this page?',
      () => requestSave(backOrHome), backOrHome, () => { });
  } else {
    backOrHome();
  }
}

/** Attaches event listeners and sets the initial menu state. */
function setupMenu() {
  document.getElementById('menu-grip').
    addEventListener('click', gripClick);

  document.getElementById('menu-back').
    addEventListener('click', backClick);

  document.getElementById('menu-print').
    addEventListener('click', () => window.print());

  document.getElementById('menu-edit').
    addEventListener('click', menuEditClick);

  document.getElementById('menu-highlight').
    addEventListener('click', menuEditClick);

  document.getElementById('menu-draw').
    addEventListener('click', menuEditClick);

  document.getElementById('menu-text').
    addEventListener('click', menuEditClick);

  document.getElementById('menu-controls').
    addEventListener('click', menuControlsClick);

  document.getElementById('menu-save').
    addEventListener('click', menuSaveClick);

  document.getElementById('menu-export-svg').
    addEventListener('click', exportSvgClick);

  document.getElementById('menu-export-png').
    addEventListener('click', exportPngClick);

  const menuFlag = document.getElementById('menu-flag');
  if (menuFlag) menuFlag.addEventListener('click', flagClick);

  const menuDownloadPdf = document.getElementById('menu-download-pdf');
  if (menuDownloadPdf) {
    menuDownloadPdf.addEventListener('click',
      () => document.getElementById('download-pdf').click());
  }

  const menuDownloadPng = document.getElementById('menu-download-png');
  if (menuDownloadPng) {
    menuDownloadPng.addEventListener('click',
      () => document.getElementById('download-png').click());
  }

  Data.Menu.Open = (Settings.Menu === 'Open');
}

/** Detect a legacy diagram URL and redirect the user to the new page. */
function legacyRedirect() {
  let indexOf = window.location.href.indexOf('#');
  if (indexOf === -1) {
    indexOf = window.location.href.indexOf('=');
  }
  if (indexOf === -1 || indexOf === window.location.href.length - 1) {
    return false;
  }
  if (window.location.href[indexOf + 1] === '*') {
    return false;
  }

  const redirect = window.location.origin + '/' +
    window.location.href.substring(indexOf + 1) + '.htm';

  location.replace(redirect);

  return true;
}

/** Loads the saved diagram referenced in the URL hash. */
function loadSavedDiagram() {
  if (!window.location.hash || window.location.hash.length <= 2) {
    modalAlert('Missing saved diagram details',
      Data.IsComparing ? undefined : backOrHome);

    return false;
  }

  // Trim '#*' and '/compare'
  if (Data.IsComparing) {
    Data.Filename = window.location.hash.slice(2, -8);
  } else {
    Data.Filename = window.location.hash.substring(2);
  }

  const json = localStorage.getItem(Data.Filename);
  if (!json) {
    modalAlert('Failed to locate saved diagram',
      Data.IsComparing ? undefined : backOrHome);

    return false;
  }

  const data = JSON.parse(json);
  if (!data || !data.SvgXml) {
    modalAlert('Failed to process saved diagram data',
      Data.IsComparing ? undefined : backOrHome);

    return false;
  }

  Data.SavedDiagramTitle = data.Title;
  document.title = `Saved Diagram: ${data.Title} | M365 Maps`;

  const svgXml = data.SvgXml.
    replace(/<!--.*-->/i, '').
    replace(/<\?xml.*\?>/i, '').
    replace(/<!doctype.*>/i, '').
    replace(/^[\n\r]+/, '');

  Data.Svg.Node = createElementFromHtml(svgXml);
  document.body.appendChild(Data.Svg.Node);

  return true;
}

/** DOM Content Loaded event handler. */
function DOMContentLoaded() {
  setupModal();

  if (Data.IsComparing) {
    document.body.style.overflow = 'hidden';
    document.getElementById('menu').style.display = 'none';
    document.getElementById('image-controls').style.display = 'none';
  } else {
    setupMenu();

    setupOfflineIndicator();
    window.addEventListener('offline', updateDownloadButtonState);
    window.addEventListener('online', updateDownloadButtonState);

    if (!Data.IsSavedDiagram) {
      loadFlags();

      // Remove leading '/' and trailing '.htm'
      Data.Filename = window.location.pathname.slice(1, -4);
    }
  }

  setupImageControls();
}

/** Page Load event handler. */
function pageLoad() {
  if (Data.IsSavedDiagram) {
    const loaded = loadSavedDiagram();
    if (!loaded) return;
  } else {
    Data.Svg.Node = document.getElementsByTagName('svg').item(0);
  }

  Data.Svg.NativeWidth = parseFloat(Data.Svg.Node.getAttribute('width'));
  Data.Svg.NativeHeight = parseFloat(Data.Svg.Node.getAttribute('height'));

  resizeSvg();
  injectHighlightStyles();

  const hasFilters = readFilterValuesfromSvg();
  if (!hasFilters) filterChange();

  if (!Data.IsComparing) {
    updateMenu();
    updateMenuFlag();
    setMenuPosition();
    setControlsPosition();
    // addTooltips();
  }

  registerSvgEvents();

  Data.Svg.Node.style.display = 'inline';
}

Data.IsComparing = window.location.hash.endsWith('/compare');
Data.IsSavedDiagram = (window.location.pathname === '/viewsvg.htm');

let redirecting = false;
if (Data.IsSavedDiagram) {
  redirecting = legacyRedirect();
}

if (!redirecting) {
  document.addEventListener('DOMContentLoaded', DOMContentLoaded);
  window.addEventListener('load', pageLoad);
}
