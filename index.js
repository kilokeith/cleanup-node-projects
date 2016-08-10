const Promise = require('bluebird');
const fs = Promise.promisifyAll(require("fs"));
const inquirer = require('inquirer');
const trash = require('trash');
const path = require("path");
const os = require('os');
// try to get user home dir
const home = os.homedir();


// timestamp of a year to this date
const oneYearAgoInMilliseconds = (new Date(new Date().setFullYear(new Date().getFullYear() - 1))).getTime();

// fix things like '~' in the path
function resolveHome(dir) {
	return path.normalize(home ? dir.replace(/^~($|\/|\\)/, `${home}$1`) : dir);
}

// get first cli arg, or ask the user for a folder
function getRootPath() {
	let rootPath = process.argv[2];

	if( !rootPath || rootPath == null || rootPath == "" ) {
		return inquirer.prompt([{
			type: 'input',
			name: 'dir',
			message: 'Enter path of directory to scan',
			// coerce relatively inputted dirs into absolute
			filter: (value) => {
				return resolveHome(value);
			},
			// check to make sure dir exists first
			validate: (value) => {
				return fs.statAsync(value)
				.then((stats) => {
					return stats.isDirectory();
				})
				// swallow errors
				.catch((err) => {
					// console.error(err);
					return false
				});
			}
		}])
		.then(function (answers) {
			// clean up the path
			rootPath = answers.dir;
			return rootPath;
		});
	} else {
		// clean up the path
		rootPath = path.normalize(rootPath);
		return Promise.resolve(rootPath);
	}
}

// check a dir for node_modules and age, eventually return bool
function testDir(dir) {
	// check for modules first
	const modulesDir = path.join(dir, "node_modules");
	return fs.statAsync(modulesDir)
	.then((mdStats) => {
		// get stats on dir
		return fs.statAsync(dir)
		.then((stats) => {
			const isDir = stats.isDirectory();
			const hasModules = mdStats.isDirectory();
			const isOld = (stats.mtime.getTime() < oneYearAgoInMilliseconds && mdStats.mtime.getTime() < oneYearAgoInMilliseconds);
			return (isDir && hasModules && isOld);
		})
		// swallow errors, return a false for test
		.catch((err) => {
			// console.error(err);
			return false
		});
	})
	// swallow errors, return a false for test
	.catch((err) => {
		// console.error(err);
		return false
	});
	
}

// gets all the old projects in a dir
function getOldProjects(rootPath) {
	// get directories from rootPath
	return fs.readdirAsync(rootPath)
	.then( (files) => {
		// will return an array of matching directories
		return Promise.reduce(files, (dirs, file) => {
			const dir = path.join(rootPath, file);
			// make sure dir exists, is older than a year, and has node_modules
			return testDir(dir)
			.then((isOldProject) => {
				// if passes tests, add it to the stack
				if( isOldProject ){
					// return path to node_modules
					dirs.push( path.join(dir, "node_modules") );
				}
				// return accumulated dirs
				return dirs;
			})
			// swallow errors, return the dirs
			.catch((err) => {
				// console.error(err);
				return dirs;
			})
		}, []);
	});
}

// get permission from the user to do it
function confirmDelete(dirs) {
	console.log(dirs);
	// prompt user
	return inquirer.prompt([{
		type: 'confirm',
		name: 'confirm',
		message: 'Are you sure you want to delete these?',
		default: false
	}])
	.then(function (answers) {
		return answers.confirm;
	});
}

// trash function, better than just rm
function cleanUpDirs(dirs, confirmed = false) {
	if(confirmed && confirmed === true){
		return trash(dirs);
		// return Promise.resolve();
	} else {
		console.log("Aborting");
		return false;
	}
}

// just terminate process
function exit() {
	console.log("All done for now!");
	process.exit();
}



// tie all the funcs together
function run() {
	getRootPath()
	.then(getOldProjects)
	.then((oldProjects) => {
		// check with the user that this is a good thing
		return confirmDelete(oldProjects)
		.then((confirmed) => {
			return cleanUpDirs(oldProjects, confirmed);
		})
	})
	.then(exit)
	.catch((err) => {
		console.error(err);
		exit()
	})
}

// kick it off
run()