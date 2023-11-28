import React, { useState, useMemo, useEffect } from 'react';
import { FilesViewer } from './FilesViewer';
import { IconFolder, IconFile, IconFolderOpen } from './Icons';

const fs = window.require('fs');
const fsExtra = window.require('fs-extra');
const pathModule = window.require('path');
const { app, dialog } = window.require('@electron/remote');

const formatSize = size => {
  var i = Math.floor(Math.log(size) / Math.log(1024));
  return (
    (size / Math.pow(1024, i)).toFixed(2) * 1 +
    ' ' +
    ['B', 'kB', 'MB', 'GB', 'TB'][i]
  );
};

function App() {
  const defaultDestinationPath = pathModule.join(
    app.getAppPath(),
    'src',
    'tally_data'
  );
  const [path, setPath] = useState(app.getAppPath());
  const [destinationPath, setDestinationPath] = useState(
    defaultDestinationPath
  );

  useEffect(() => {
    setDestinationPath(defaultDestinationPath);
  }, [defaultDestinationPath]);

  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchString, setSearchString] = useState('');

  const files = useMemo(() => {
    try {
      return fs
        .readdirSync(path)
        .map(file => {
          const filePath = pathModule.join(path, file);
          try {
            const stats = fs.statSync(filePath);
            return {
              name: file,
              size: stats.isFile() ? formatSize(stats.size ?? 0) : null,
              directory: stats.isDirectory(),
            };
          } catch (error) {
            console.error(`Error reading stats for file ${filePath}:`, error);
            return null;
          }
        })
        .filter(file => file !== null);
    } catch (error) {
      console.error(`Error reading directory ${path}:`, error);
      return [];
    }
  }, [path]);

  const onBack = () => setPath(pathModule.dirname(path));
  const onOpen = folder => setPath(pathModule.join(path, folder));

  const filteredFiles = files.filter(s =>
    s.name.toLowerCase().startsWith(searchString.toLowerCase())
  );

  const handlePathChange = async newPath => {
    try {
      await fsExtra.access(
        newPath,
        fsExtra.constants.R_OK | fsExtra.constants.W_OK
      );
      setPath(newPath);
    } catch (error) {
      console.error('Error accessing the selected path:', error);
    }
  };

  const openPathDialog = async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select TALLY_DATA_PATH',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      await handlePathChange(selectedPath);
    }
  };

  const handleDestinationPathChange = async newPath => {
    try {
      await fsExtra.access(
        newPath,
        fsExtra.constants.R_OK | fsExtra.constants.W_OK
      );
      setDestinationPath(newPath);
    } catch (error) {
      console.error('Error accessing the selected destination path:', error);
    }
  };

  const openDestinationPathDialog = async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Destination Path',
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      await handleDestinationPathChange(selectedPath);
    }
  };

  const syncData = async () => {
    setSyncing(true);
    setSyncMessage('');
    setErrorMessage('');

    const TALLY_DATA_PATH = path;

    if (!TALLY_DATA_PATH) {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select TALLY_DATA_PATH',
      });

      if (result.canceled || result.filePaths.length === 0) {
        console.warn('User canceled path selection.');
        setSyncing(false);
        return;
      }

      const selectedPath = result.filePaths[0];
      setPath(selectedPath);
    }

    try {
      await fsExtra.ensureDir(destinationPath);
      await fsExtra.copy(TALLY_DATA_PATH, destinationPath, { overwrite: true });
      setSyncMessage('Data synced successfully.');
    } catch (error) {
      console.error('Error syncing data:', error);
      setErrorMessage(`Error syncing data: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-md-6">
          <div className="form-group mb-3">
            <label htmlFor="pathInput" className="form-label">
              TALLY_DATA_PATH:
            </label>
            <div className="input-group">
              <input
                id="pathInput"
                type="text"
                className="form-control"
                value={path}
                onChange={e => handlePathChange(e.target.value)}
              />
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={openPathDialog}
              >
                Browse
              </button>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="form-group mb-3">
            <label htmlFor="destinationPathInput" className="form-label">
              Destination Path:
            </label>
            <div className="input-group">
              <input
                id="destinationPathInput"
                type="text"
                className="form-control"
                value={destinationPath}
                onChange={e => handleDestinationPathChange(e.target.value)}
              />
              <button
                className="btn btn-outline-secondary"
                type="button"
                onClick={openDestinationPathDialog}
              >
                Browse
              </button>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={syncData}
        className="btn btn-primary mt-2"
        disabled={syncing}
      >
        {syncing ? 'Syncing...' : 'Sync Data'}
      </button>

      {syncMessage && (
        <div className="alert alert-success mt-3">{syncMessage}</div>
      )}
      {errorMessage && (
        <div className="alert alert-danger mt-3">{errorMessage}</div>
      )}

      <div className="row mt-4">
        <div className="col-md-6">
          <input
            value={searchString}
            onChange={event => setSearchString(event.target.value)}
            className="form-control form-control-sm"
            placeholder="File search"
          />
        </div>
      </div>

      <FilesViewer files={filteredFiles} onBack={onBack} onOpen={onOpen} />
    </div>
  );
}

export default App;