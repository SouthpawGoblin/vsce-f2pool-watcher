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

let failed = false
let interval: NodeJS.Timeout | null = null
let myStatusBarItem: vscode.StatusBarItem;

export function activate({ subscriptions }: vscode.ExtensionContext) {
	// register a command that updates the info
	const myCommandId = 'f2pool-watcher.update';
	subscriptions.push(vscode.commands.registerCommand(myCommandId, async () => {
		const config = vscode.workspace.getConfiguration('f2poolWatcher')
		if (failed || !config.get('currency')) {
			const val = await vscode.window.showQuickPick(Object.keys(CURRENCIES), {
				placeHolder: 'Select a currency',
			})
			await config.update('currency', val, true)
		} 
		if (failed || !config.get('username')) {
			const val = await vscode.window.showInputBox({
				placeHolder: 'Enter F2Pool username',
				value: config.get('username') || '',
			})
			await config.update('username', val, true)
		}
		updateStatusBarItem()
	}));

	// create a new status bar item that we can now manage
	myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	myStatusBarItem.command = myCommandId;
	subscriptions.push(myStatusBarItem);

	vscode.workspace.onDidChangeConfiguration(() => {
		setRefreshInterval()
		updateStatusBarItem()
	})
	
	// update status bar item once at start
	setRefreshInterval()
	updateStatusBarItem()
}

function updateStatusBarItem(): void {
	const config = vscode.workspace.getConfiguration('f2poolWatcher')
	if (!config || !config.get('currency') || !config.get('username')) {
		myStatusBarItem.text = `$(ruby) Click to configure f2pool-watcher`
		myStatusBarItem.tooltip = undefined
		myStatusBarItem.show();
	} else {
		const currency = config.get('currency') as string
		const currencyUrlSegment = CURRENCIES[currency]
		const username = config.get('username')

		// query f2pool api
		myStatusBarItem.text = `$(ruby) Refreshing f2pool-watcher...`
		myStatusBarItem.tooltip = undefined
		myStatusBarItem.show();
		const url = `https://api.f2pool.com/${currencyUrlSegment}/${username}`
		axios.get<ResF2poolInfo>(url)
			.then(res => {
				const {
					value,
					value_today,
					hashrate,
					worker_length,
					worker_length_online,
				} = res.data
				myStatusBarItem.text = 
					`$(ruby) ${currency}-${username} | $(pulse) ${value_today.toFixed(8)}/${value.toFixed(8)} | $(dashboard) ${(hashrate / 1e6).toFixed(2)}MH/s | $(rocket) ${worker_length_online}/${worker_length}`;
				myStatusBarItem.tooltip = 
					`${currency}-${username}\ntoday: ${value_today.toFixed(8)}\ntotal: ${value.toFixed(8)}\nhashrate: ${(hashrate / 1e6).toFixed(2)}MH/s\nworkers(online/total): ${worker_length_online}/${worker_length}\n(click to refresh)`;
				myStatusBarItem.show();
				failed = false
			})
			.catch((e) => {
				myStatusBarItem.text = `$(ruby) Click to configure f2pool-watcher`
				myStatusBarItem.tooltip = undefined
				myStatusBarItem.show();
				vscode.window.showErrorMessage(`Failed to get F2Pool info, please check the plugin settings and try again.`)
				failed = true
			})
	}
}

function setRefreshInterval(): void {
	const config = vscode.workspace.getConfiguration('f2poolWatcher')
	const refreshInterval = config.get('refreshInterval') as number

	// interval must be longer than 5 minutes to prevent frequent API call
	if (!!config.get('currency') && !!config.get('username') && refreshInterval >= 5) {
		interval && clearInterval(interval)
		interval = setInterval(() => {
			updateStatusBarItem()
		}, refreshInterval * 60 * 1000)
	}
}
