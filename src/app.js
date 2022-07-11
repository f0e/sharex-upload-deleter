import fs from 'fs-extra';
import axios from 'axios';
import path from 'path';
import FormData from 'form-data';

import config from '../config.js';

const HISTORY_FILE = 'history.json';
const DELETED_FILE = 'history/deleted.txt';
const OUTPUT_FOLDER = 'out';

async function run() {
  await fs.ensureFile(DELETED_FILE);
  await fs.ensureDir(OUTPUT_FOLDER);

  if (
    !config.SCREENSHOTS_DIR ||
    !(await fs.existsSync(config.SCREENSHOTS_DIR))
  ) {
    console.log('ShareX screenshots directory not valid');
    return;
  }

  // read screenshot history
  const history = await fs.readJSON(HISTORY_FILE);

  const deletableFiles = history.filter((file) => file.DeletionURL);
  const hosts = [...new Set(deletableFiles.map((file) => file.Host))];

  console.log(`${deletableFiles.length} images to be deleted`);
  console.log(hosts.join(', '));

  // build files year map
  const filesPerYear = {};
  deletableFiles.forEach((file) => {
    const date = new Date(file.DateTime);
    const year = date.getFullYear();

    if (!(year in filesPerYear)) filesPerYear[year] = [];
    filesPerYear[year].push(file);
  });

  // get list of previously deleted files
  const deletedFiles = (await fs.readFile(DELETED_FILE)).toString().split('\n');

  // parse files
  for (const [year, files] of Object.entries(filesPerYear)) {
    console.log(`${year}: ${files.length} files`);

    for (const [i, file] of files.entries()) {
      if (file.URL == config.STOP_URL) {
        console.log('reached stop url. stopping');
        return;
      }

      let fixedFilePath = path.join(
        config.SCREENSHOTS_DIR,
        file.FilePath.split('\\Screenshots\\').at(-1)
      );

      // download the file if it doesn't exist locally
      const fileDownloaded = await fs.existsSync(fixedFilePath);
      if (!fileDownloaded) {
        // file not stored in dir. either deleted or uploaded from file
        const imageID = file.URL.split('/').at(-1).split('.')[0];
        const downloadFileName = imageID + ' - ' + file.FileName;

        fixedFilePath = path.join(OUTPUT_FOLDER, downloadFileName);

        // check if we already downloaded it
        if (!(await fs.existsSync(fixedFilePath))) {
          // try downloading it
          console.log('file not stored');
          console.log('path:', file.FilePath);
          console.log('url:', file.URL);

          const res = await axios.get(file.URL, {
            responseType: 'arraybuffer',
          });

          const redirectURL = res.request.res.responseUrl;
          if (redirectURL == 'https://i.imgur.com/removed.png') {
            console.log("can't download image since it's been deleted");

            // don't have to delete it, skip
            console.log();
            continue;
          }

          await fs.writeFile(fixedFilePath, res.data);
          console.log('downloaded');
          console.log();
        }
      }

      // check if we know the file's already been deleted
      if (deletedFiles.includes(file.URL)) continue;

      // delete the image
      const fixedDeletionUrl = file.DeletionURL.replace('http://', 'https://'); // whatever
      console.log(`(${i + 1}/${files.length}) - ${fixedFilePath}`);

      switch (file.Host) {
        case 'Imgur':
          const form = new FormData();
          form.append('confirm', 'true');

          const res = await axios.post(fixedDeletionUrl, form);

          if (
            res.data.includes(
              "This isn't a valid image link! Go on, get out of here!"
            )
          ) {
            await fs.appendFile(DELETED_FILE, file.URL + '\n');
            console.log('image was already deleted');
            break;
          }

          if (res.data.includes('Your image has been deleted.')) {
            await fs.appendFile(DELETED_FILE, file.URL + '\n');
            console.log('image deleted');
            break;
          }

          // fail
          console.log(res.data);
          console.log('request failed');
        default:
          console.log(`host ${file.Host} is not supported`);
      }

      console.log();
    }
  }
}

run();
