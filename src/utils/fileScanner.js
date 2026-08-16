import JSZip from 'jszip';
import { parseSRT } from './srtParser';

// Recursively scan a FileSystemEntry (File or Directory) for .srt files
async function scanEntry(entry, path = '') {
  const srtFiles = [];

  if (entry.isFile) {
    if (entry.name.toLowerCase().endsWith('.srt')) {
      const file = await new Promise((resolve, reject) => {
        entry.file(resolve, reject);
      });

      const fullPath = path ? `${path}/${entry.name}` : entry.name;
      srtFiles.push({ file, fullPath });
    }
  } else if (entry.isDirectory) {
    const dirReader = entry.createReader();
    const entries = await new Promise((resolve, reject) => {
      dirReader.readEntries(resolve, reject);
    });

    const currentPath = path ? `${path}/${entry.name}` : entry.name;
    for (const childEntry of entries) {
      const childFiles = await scanEntry(childEntry, currentPath);
      srtFiles.push(...childFiles);
    }
  }

  return srtFiles;
}

// Process DataTransfer items from Drag & Drop (supports nested folders)
export async function getFilesFromDataTransfer(dataTransferItems) {
  const entries = [];
  for (let i = 0; i < dataTransferItems.length; i++) {
    const item = dataTransferItems[i];
    if (item.kind === 'file') {
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) {
        entries.push(entry);
      }
    }
  }

  const srtFileObjects = [];
  for (const entry of entries) {
    const scanned = await scanEntry(entry);
    srtFileObjects.push(...scanned);
  }

  return srtFileObjects;
}

// Process a .ZIP archive containing nested folders and .srt files
export async function processZipFile(zipFile) {
  const zip = await JSZip.loadAsync(zipFile);
  const srtItems = [];

  for (const relativePath of Object.keys(zip.files)) {
    const zipEntry = zip.files[relativePath];
    if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.srt')) {
      const text = await zipEntry.async('string');
      const parsed = parseSRT(text);
      if (parsed.length > 0) {
        // Build clean display name from folder path
        const parts = relativePath.split('/');
        const fileName = parts.pop();
        const parentFolder = parts.length > 0 ? parts[parts.length - 1] : '';
        
        let displayName = relativePath;
        if (parentFolder && (fileName.toLowerCase() === 'sub.srt' || fileName.toLowerCase() === 'subtitle.srt' || fileName.toLowerCase() === 'vietnamese.srt')) {
          displayName = `${parentFolder} - ${fileName}`;
        }

        srtItems.push({
          name: displayName,
          text: text,
          parsed: parsed
        });
      }
    }
  }

  return srtItems;
}

// Format smart file name for nested directory files
export function getSmartFileName(fileObj) {
  const path = fileObj.webkitRelativePath || fileObj.fullPath || fileObj.name;
  if (!path) return fileObj.name;

  const parts = path.split('/');
  if (parts.length > 1) {
    const fileName = parts[parts.length - 1];
    const folderName = parts[parts.length - 2];
    if (fileName.toLowerCase().startsWith('sub') || fileName.toLowerCase().startsWith('subtitle') || fileName.toLowerCase().startsWith('viet')) {
      return `${folderName}_${fileName}`;
    }
    return `${folderName} / ${fileName}`;
  }

  return fileObj.name;
}
