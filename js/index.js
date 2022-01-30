/// <reference path="common.js" />
/* global isEmbedded, StoreName */

/** Sets the display properties and attaches event listeners to flags. */
function setupFlags() {
  let flags = [];
  const flagsJSON = localStorage.getItem(StoreName.Flags);
  if (flagsJSON) flags = JSON.parse(flagsJSON);

  const links = document.getElementsByClassName('diagram-link');
  for (const link of links) {
    const filename = link.pathname.slice(1, -4);
    if (flags.includes(filename)) link.classList.add('flagged');

    // TODO: Hover preview?
    // const preview = document.createElement('img');
    // preview.src = '/' + filename + '.svg';
    // preview.height = "200";
    // button.nextSibling.appendChild(preview);
  }
}

/** DOM Content Loaded event handler. */
function DOMContentLoaded() {
  if (isEmbedded()) {
    document.getElementById('footer').style.display = 'none';
  }

  setupFlags();
}

document.addEventListener('DOMContentLoaded', DOMContentLoaded);
