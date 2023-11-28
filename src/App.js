import { useState, useMemo } from 'react'
import { FilesViewer } from './FilesViewer'

const fs = window.require('fs')
const fsExtra = window.require('fs-extra')
const pathModule = window.require('path')

const { app } = window.require('@electron/remote')

const formatSize = size => {
  var i = Math.floor(Math.log(size) / Math.log(1024))
  return (
    (size / Math.pow(1024, i)).toFixed(2) * 1 +
    ' ' +
    ['B', 'kB', 'MB', 'GB', 'TB'][i]
  )
}

function App() {
  const [path, setPath] = useState(app.getAppPath())

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
              directory: stats.isDirectory()
            };
          } catch (error) {
            console.error(`Error reading stats for file ${filePath}:`, error);
            return null; // or handle the error in a way that makes sense for your application
          }
        })
        .filter(file => file !== null);
    } catch (error) {
      console.error(`Error reading directory ${path}:`, error);
      return [];
    }
  }, [path]);

  const onBack = () => setPath(pathModule.dirname(path))
  const onOpen = folder => setPath(pathModule.join(path, folder))

  const [searchString, setSearchString] = useState('')
  const filteredFiles = files.filter(s => s.name.startsWith(searchString))

  const syncData = async () => {
    const TALLY_DATA_PATH = 'C:\\Users\\Public\\TallyPrimeEditLog\\data'; // Replace with your actual path
    const destinationPath = pathModule.join(app.getAppPath(), 'src', 'tally_data');
  
    try {
      // Ensure the destination directory exists
      await fsExtra.ensureDir(destinationPath);
  
      // Copy data from TALLY_DATA_PATH to the destination path
      await fsExtra.copy(TALLY_DATA_PATH, destinationPath, { overwrite: true });
  
      console.info('Data synced successfully.');
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  };

  return (
    <div className="container mt-2">
      <button onClick={syncData} className="btn btn-primary mt-2">
        Sync Data
      </button>
      <h4>{path}</h4>{console.info("path++ ", path)}
      <div className="form-group mt-4 mb-2">
        <input
          value={searchString}
          onChange={event => setSearchString(event.target.value)}
          className="form-control form-control-sm"
          placeholder="File search"
        />
      </div>
      <FilesViewer files={filteredFiles} onBack={onBack} onOpen={onOpen} />
    </div>
  )
}

export default App
