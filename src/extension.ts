import axios from 'axios';
import * as vscode from 'vscode';

interface ResF2poolInfo {
	value: number
	value_today: number
	hashrate: number
	worker_length: number
	worker_length_online: number
}

const CURRENCIES: { [key: string]: string } = {
  "BTC": "bitcoin",
  "LTC": "litecoin",
  "ETH": "ethereum"
}

let myStatusBarItem: vscode.StatusBarItem;

export function activate({ subscriptions }: vscode.ExtensionContext) {
	// register a command that updates the info
	const myCommandId = 'f2pool-watcher.update';
	subscriptions.push(vscode.commands.registerCommand(myCommandId, async () => {
		const config = vscode.workspace.getConfiguration('f2poolWatcher')
		if (!config.get('currency')) {
			const val = await vscode.window.showQuickPick(Object.keys(CURRENCIES), {
				placeHolder: 'Select a currency',
			})
			await config.update('currency', val, true)
		} 
		if (!config.get('username')) {
			const val = await vscode.window.showInputBox({
				placeHolder: 'Enter F2Pool username',
			})
			await config.update('username', val, true)
		}
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
	const config = vscode.workspace.getConfiguration('f2poolWatcher')
	if (!config || !config.get('currency') || !config.get('username')) {
		myStatusBarItem.text = `$(ruby) Click to config f2pool-watcher`
		myStatusBarItem.show();
	} else {
		const url = `https://api.f2pool.com/${CURRENCIES[config.get('currency') as string]}/${config.get('username')}`
		axios.get<ResF2poolInfo>(url).then(res => {
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
}
