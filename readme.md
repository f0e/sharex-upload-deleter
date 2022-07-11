# ShareX Upload Deleter

This is a simple script which parses your ShareX history file and deletes any screenshots which have been uploaded to Imgur.

The application will also check to see if screenshots exist locally before deleting them, and will download any missing screenshots.

## Requirements

- [Node.js](https://nodejs.org/en/)
- [Yarn](https://classic.yarnpkg.com/lang/en/docs/install/#windows-stable)

## Setup

- Locate your latest history.json file in your ShareX/backup directory and place it in the project root directory, renaming it to `history.json`.
- Edit `config.js` and add your current ShareX screenshots folder

## Usage

Open `run.bat` or run the commands:

```
yarn
yarn start
```
