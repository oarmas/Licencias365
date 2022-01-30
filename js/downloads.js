/// <reference path="common.js" />
/* global isEmbedded */

/** DOM Content Loaded event handler. */
function DOMContentLoaded() {
  if (isEmbedded()) {
    document.getElementById('menu').style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', DOMContentLoaded);
