import axios from 'axios';
import * as vscode from 'vscode';

interface ResF2poolInfo {
	value: number
	value_today: number
	hashrate: number
	worker_length: number
	worker_length_online: number
}

let myStatusBarItem: vscode.StatusBarItem;

export function activate({ subscriptions }: vscode.ExtensionContext) {

	// register a command that updates the info
	const myCommandId = 'f2pool-watcher.update';
	subscriptions.push(vscode.commands.registerCommand(myCommandId, () => {
		updateStatusBarItem()
	}));

	// create a new status bar item that we can now manage
	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	myStatusBarItem.command = myCommandId;
	subscriptions.push(myStatusBarItem);

	// update status bar item once at start
	updateStatusBarItem();
}

function updateStatusBarItem(): void {
	axios.get<ResF2poolInfo>('https://api.f2pool.com/eth/rustchi').then(res => {
		const {
			value,
			value_today,
			hashrate,
			worker_length,
			worker_length_online,
		} = res.data
		myStatusBarItem.text = 
			`$(ruby) ETH-rustchi | $(pulse) ${value_today.toFixed(8)}/${value.toFixed(8)} | $(dashboard) ${(hashrate / 1e6).toFixed(2)}MH/s | $(rocket) ${worker_length_online}/${worker_length}`;
		myStatusBarItem.tooltip = 
			`ETH-rustchi\ntoday: ${value_today.toFixed(8)}\ntotal: ${value.toFixed(8)}\nhashrate: ${(hashrate / 1e6).toFixed(2)}MH/s\nworkers(online/total): ${worker_length_online}/${worker_length}\n(click to refresh)`;
		myStatusBarItem.show();
	})
}
