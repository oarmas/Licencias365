/// <reference path="common.js" />
/* global isEmbedded, StoreName, setupOfflineIndicator */

// Variables
let Flags = [];

/** Updates the visual appearance of a button to match state. */
/* eslint no-param-reassign:
 ["error", { "props":true, "ignorePropertyModificationsFor":["button"] }] */
function updateFlag(button, state) {
  if (state) {
    button.title = 'Remove flag';
    button.classList.add('flagged');
    button.classList.remove("unflagged");
  } else {
    button.title = 'Flag this diagram';
    button.classList.add('unflagged');
    button.classList.remove("flagged");
  }
}

/** Handles the user clicking the Flag item beside a diagram link. */
function flagClick(event) {
  const filename = event.target.nextSibling.pathname.slice(1, -4);

  const flagIndex = Flags.indexOf(filename);
  if (flagIndex === -1) {
    Flags.push(filename);
    updateFlag(event.target, true);
  } else {
    Flags.splice(flagIndex, 1);
    updateFlag(event.target, false);
  }

  localStorage.setItem(StoreName.Flags, JSON.stringify(Flags));
}

/** Handles the user clicking the Flag all item at the bottom of the links. */
function flagAllClick(event) {
  event.preventDefault();

  Flags = [];

  const links = document.getElementsByClassName('link-text');
  for (const link of links) {
    const filename = link.pathname.slice(1, -4);
    Flags.push(filename);

    updateFlag(link.previousSibling, true);
  }

  const flagsJSON = JSON.stringify(Flags);
  localStorage.setItem(StoreName.Flags, flagsJSON);
}

/** Handles the user clicking the clear all flags item at the bottom of the
 * links. */
function clearFlagsClick(event) {
  event.preventDefault();

  Flags = [];

  const flagsJSON = JSON.stringify(Flags);
  localStorage.setItem(StoreName.Flags, flagsJSON);

  const links = document.getElementsByClassName('link-text');
  for (const link of links) {
    updateFlag(link.previousSibling, false);
  }
}

/** Sets the display properties and attaches event listeners to flags. */
function setupFlags() {
  const flagsJSON = localStorage.getItem(StoreName.Flags);
  if (flagsJSON) Flags = JSON.parse(flagsJSON);

  const buttons = document.getElementsByClassName('flag-button');
  for (const button of buttons) {
    button.addEventListener('click', flagClick);

    const filename = button.nextSibling.pathname.slice(1, -4);

    // TODO: Hover preview?
    // const preview = document.createElement('img');
    // preview.src = '/' + filename + '.svg';
    // preview.height = "200";
    // button.nextSibling.appendChild(preview);

    updateFlag(button, Flags.includes(filename));
  }

  document.getElementById('clear-all').
    addEventListener('click', clearFlagsClick);

  document.getElementById('flag-all').
    addEventListener('click', flagAllClick);
}

/** DOM Content Loaded event handler. */
function DOMContentLoaded() {
  if (isEmbedded()) {
    document.getElementById('footer').style.display = 'none';
  }

  setupOfflineIndicator();
  setupFlags();
}

document.addEventListener('DOMContentLoaded', DOMContentLoaded);
