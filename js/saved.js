/// <reference path="common.js" />
/* global showModalDialog, getModalInputText, isEmbedded, exportSvg, exportPng,
   StoreName, isIOS, setupModal */

/** Creates a visual divider for the item list. */
function newDivider() {
  const element = document.createElement('div');
  element.className = 'divider';
  return element;
}

/** Creates a diagram name link. */
function newDiagramLink(text, href) {
  const element = document.createElement('a');
  element.className = 'diagram';
  element.textContent = text;
  element.href = href;
  return element;
}

/** Creates an 'Export PNG' button. */
function newPngButton() {
  const pngLink = document.createElement('button');
  pngLink.type = 'button';
  pngLink.className = 'export';
  pngLink.title = 'Export PNG';
  pngLink.textContent = 'PNG';
  return pngLink;
}

/** Creates an 'Export SVG' button. */
function newSvgButton() {
  const svgLink = document.createElement('button');
  svgLink.type = 'button';
  svgLink.className = 'export';
  svgLink.title = 'Export SVG';
  svgLink.textContent = 'SVG';
  return svgLink;
}

/** Creates a 'Delete' button. */
function newDeleteButton() {
  const deleteImage = document.createElement('button');
  deleteImage.type = 'button';
  deleteImage.className = 'delete';
  deleteImage.title = 'Delete';
  return deleteImage;
}

/** Creates a 'Rename' button. */
function newRenameButton() {
  const renameImage = document.createElement('button');
  renameImage.type = 'button';
  renameImage.className = 'rename';
  renameImage.title = 'Rename';
  return renameImage;
}

/** Adds the message ot show there are no saved diagrams. */
function addEmptyMessage(container) {
  const message = document.createElement('p');
  message.innerText = 'There are no saved diagrams.';
  container.appendChild(message);
}

/** Adds a new row to the saved diagrams list. */
function addNewRow(container, key, entry) {
  const entryLink = newDiagramLink(entry.Title, `/viewsvg.htm#*${key}`);
  container.appendChild(entryLink);

  const entryRename = newRenameButton();
  container.appendChild(entryRename);

  const entryDelete = newDeleteButton();
  container.appendChild(entryDelete);

  const entrySvgButton = newSvgButton();
  container.appendChild(entrySvgButton);

  const entryPngButton = newPngButton();
  container.appendChild(entryPngButton);

  const thisDivider = newDivider();
  container.appendChild(thisDivider);

  entryRename.addEventListener('click', function renameClick() {
    showModalDialog('Rename saved diagram:', true, entryLink.textContent,
      'OK', function renameOK() {
        const newName = getModalInputText();
        if (!newName) return;
        entry.Title = newName;
        const entryJSON = JSON.stringify(entry);
        localStorage.setItem(key, entryJSON);
        entryLink.textContent = newName;
      },
      undefined, undefined,
      'Cancel', undefined);
  });

  entryDelete.addEventListener('click', function deleteClick() {
    showModalDialog(
      `Are you sure you want to delete "${entryLink.textContent}"?`,
      false, undefined,
      'Yes', function deleteYes() {
        localStorage.removeItem(key);

        container.removeChild(entryLink);
        container.removeChild(entryRename);
        container.removeChild(entryDelete);
        container.removeChild(entrySvgButton);
        container.removeChild(entryPngButton);
        container.removeChild(thisDivider);

        if (container.getElementsByClassName('diagram').length === 0) {
          container.innerHTML = '';
          container.appendChild(newDivider());
          addEmptyMessage(container);
          container.appendChild(newDivider());
        }
      },
      undefined, undefined,
      'No', undefined);
  });

  entrySvgButton.addEventListener('click',
    function svgLinkClick(event) {
      event.preventDefault();
      exportSvg(entry.Title + '.svg', entry.SvgXml);
    }
  );

  entryPngButton.addEventListener('click',
    function pngLinkClick() {
      const background =
        window.getComputedStyle(document.body).backgroundColor;
      exportPng(entry.Title + '.png', entry.SvgXml, background);
    }
  );
}

/** Adds all the saved diagrams onto the page. */
function populateList() {
  const container = document.getElementById('collection');
  container.innerHTML = '';

  container.appendChild(newDivider());

  let keys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key !== StoreName.Flags &&
        key !== StoreName.Settings &&
        key !== StoreName.MatrixSelection) {
      keys.push(key);
    }
  }

  keys = keys.sort(
    function keysSort(a, b) {
      return parseInt(a) - parseInt(b);
    }
  );

  for (const key of keys) {
    const entryJSON = localStorage.getItem(key);
    if (entryJSON) {
      const entry = JSON.parse(entryJSON);
      if (entry) {
        addNewRow(container, key, entry);
      }
    }
  }

  if (keys.length === 0) {
    addEmptyMessage(container);
    container.appendChild(newDivider());
  }
}

/** Imports the file at index from the files list. */
function processImport(files, index) {
  const file = files[index];

  const reader = new FileReader();
  reader.addEventListener('load',
    function fileLoaded(event) {
      showModalDialog(
        files.length === 0 ?
          'Import diagram as:' :
          `Import diagram ${index + 1} of ${files.length} as:`,
        true, file.name,
        'OK', function importOK() {
          const diagramTitle = getModalInputText();
          if (!diagramTitle) return;

          const storageKey = Date.now().toString();
          const svgObject = {
            Title: diagramTitle,
            SvgXml: event.target.result,
          };

          const jsonData = JSON.stringify(svgObject);
          localStorage.setItem(storageKey, jsonData);

          populateList();

          if (index !== files.length - 1) {
            index++;
            processImport(files, index);
          }
        },
        undefined, undefined,
        files.length === 1 ? 'Cancel' : 'Skip',
        function importSkipOrCancel() {
          if (index !== files.length - 1) {
            processImport(files, ++index);
          }
        });
    }
  );

  reader.readAsText(file);
}

/** Imports the selected files into the Saved Diagrams list. */
function filesSelected(event) {
  processImport(event.target.files, 0);
}

/** Clicks the export link corresponding with the supplied exportType for
 * all saved diagrams. */
function exportAllDiagrams(exportType) {
  const exportLinks = document.getElementsByClassName('export');
  for (const exportLink of exportLinks) {
    if (exportLink.textContent === exportType) {
      exportLink.click();
    }
  }
}

/** DOM Content Loaded event handler. */
function DOMContentLoaded() {
  if (isEmbedded()) {
    document.getElementById('menu').style.display = 'none';
  }

  setupModal();
  populateList();

  if (isIOS) {
    document.getElementById('export-all-png').style.display = 'none';
  } else {
    document.getElementById('export-all-png').addEventListener('click',
      () => exportAllDiagrams('PNG'));
  }

  if (isIOS) {
    document.getElementById('export-all-svg').style.display = 'none';
  } else {
    document.getElementById('export-all-svg').addEventListener('click',
      () => exportAllDiagrams('SVG'));
  }

  document.getElementById('import').addEventListener('click',
    () => document.getElementById('file-selector').click());

  document.getElementById('file-selector').
    addEventListener('change', filesSelected);
}

document.addEventListener('DOMContentLoaded', DOMContentLoaded);
