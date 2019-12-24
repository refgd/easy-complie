import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../extension';

const fs = require('fs-plus');
//remove old output files
// fs.removeSync('out/node_modules');

let basePath: string | undefined;
if(vscode.workspace.workspaceFolders){
	basePath = vscode.workspace.workspaceFolders[0].uri.path;
	basePath = basePath.replace(/^\/([a-zA-Z]+:\/)/g, "$1");
	fs.removeSync(basePath+'/output');
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => {
	  setTimeout(resolve, ms)
	})
}

function checkDiagnostics(ext){
	let diagnostics = vscode.languages.getDiagnostics();
	
	assert.notEqual(diagnostics.length, 0, "Should have diagnostics");
	diagnostics.forEach(diagnostic => {
		if(diagnostic[0].path.indexOf(ext)>0){
			assert.equal(diagnostic[1].length, 0, JSON.stringify(diagnostic[1], null, 4));
		}
	});
}

//output
suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('Minify JS File', async () => {
		const filePath = basePath+'/js/test.js';
		await vscode.commands.executeCommand("easyCompile.minify", vscode.Uri.parse(filePath));
		await sleep(2000);
		checkDiagnostics('.js');
		assert.equal(fs.existsSync(basePath+'/output/js/test.min.js'), true, 'Minify JS file not exists');
		assert.equal(fs.md5ForPath(basePath+'/output/js/test.min.js'), '59a9c639b7f0a44381f8c94c3558558d', 'Minify JS file incorrect');
		
	}).timeout(5000);

	test('Minify CSS File', async () => {
		const filePath = basePath+'/css/test.css';
		await vscode.commands.executeCommand("easyCompile.minify", vscode.Uri.parse(filePath));
		await sleep(2000);
		checkDiagnostics('.css');
		assert.equal(fs.existsSync(basePath+'/output/css/test.min.css'), true, 'Minify CSS file not exists');
		assert.equal(fs.md5ForPath(basePath+'/output/css/test.min.css'), 'bc52f4f98586e5d077b8b6bd8ccafd19', 'Minify CSS file incorrect');
		
		assert.equal(fs.existsSync(basePath+'/output/css/test.min.css.map'), true, 'CSS Map file not exists');
		assert.equal(fs.md5ForPath(basePath+'/output/css/test.min.css.map'), '8254df72f787af6271f541d62f1a4178', 'CSS Map file incorrect');
	}).timeout(5000);

	test('Compile Less File', async () => {
		const filePath = basePath+'/less/test.less';
		await vscode.commands.executeCommand("easyCompile.compile", vscode.Uri.parse(filePath));
		await sleep(3000);
		checkDiagnostics('.less');
		assert.equal(fs.existsSync(basePath+'/output/less/test.css'), true, 'Less Compiled file not exists');
		assert.equal(fs.md5ForPath(basePath+'/output/less/test.css'), '3b0fa3aec59cd488423941d5631fbd54', 'Less Compiled file incorrect');
		
		assert.equal(fs.existsSync(basePath+'/output/less/test.css.map'), true, 'Less Map file not exists');
		assert.equal(fs.md5ForPath(basePath+'/output/less/test.css.map'), 'a8852f90515c625f531a56c2561b11ff', 'Less Map file incorrect');
	}).timeout(5000);

	test('Compile Scss File', async () => {
		const filePath = basePath+'/scss/test.scss';
		await vscode.commands.executeCommand("easyCompile.compile", vscode.Uri.parse(filePath));
		await sleep(3000);
		checkDiagnostics('.scss');
		assert.equal(fs.existsSync(basePath+'/output/scss/test.css'), true, 'Scss Compiled file not exists');
		assert.equal(fs.md5ForPath(basePath+'/output/scss/test.css'), 'eef04d610cb711023917982699bc6d5d', 'Scss Compiled file incorrect');
		
		assert.equal(fs.existsSync(basePath+'/output/scss/test.css.map'), true, 'Scss Map file not exists');
		assert.equal(fs.md5ForPath(basePath+'/output/scss/test.css.map'), '9e3ae0fb31b32f8c69f0662e16997bf0', 'Scss Map file incorrect');
	}).timeout(5000);

	test('Compile TS File', async () => {
		const filePath = basePath+'/typescript/test.ts';
		await vscode.commands.executeCommand("easyCompile.compile", vscode.Uri.parse(filePath));
		await sleep(3500);
		checkDiagnostics('.ts');
		assert.equal(fs.existsSync(basePath+'/output/ts/test.js'), true, 'TS Compiled file not exists');
		assert.equal(fs.md5ForPath(basePath+'/output/ts/test.js'), '340876f1b2ee035037bbbefe9f692d69', 'TS Compiled file incorrect');
	}).timeout(5000);
});
