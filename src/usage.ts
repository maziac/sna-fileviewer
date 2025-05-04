import * as vscode from 'vscode';
import TelemetryReporter from '@vscode/extension-telemetry';


export class Usage {
	// The connection string for usage statistics.
	private static connectionString = '...';

	// The telemetry reporter instance.
	private static telemetryReporter?: TelemetryReporter;

	// Used for heartbeat events.
	private static heartbeatTimer?: NodeJS.Timer;

	// Holds the extension's context.
	private static context: vscode.ExtensionContext


	/** Creates a telemetry instance.
	 * Call this only one in the beginning of the extension 'activate'.
	 * @param context The extension's context.
	 */
	public static init(context: vscode.ExtensionContext) {
		this.context = context;
		this.activateDeactivate();
		// Check for changes on the telemetry settings
		vscode.env.onDidChangeTelemetryEnabled(() => {
			this.activateDeactivate();
		});
	}


	/** Activates or deactivates the telemetry reporter.
	 * Depending on the user's vscode settings:
	 * - 'all' -> activated
	 * - 'error', 'crash' or 'off' -> deactivated
	 */
	private static activateDeactivate() {
		if (vscode.env.isTelemetryEnabled) { // true only, if 'all' is set.
			// ACTIVATE
			// Just in case:
			this.disposeTelemetryReporter();
			// Connect
			this.telemetryReporter = new TelemetryReporter(this.connectionString);
			this.context.subscriptions.push(this.telemetryReporter);
			// Send activated event
			this.sendActivated();
			// Send heartbeat event every few hours
			this.sendHeartbeat();
			this.heartbeatTimer = setInterval(() => {
				this.sendHeartbeat();
			}, 1000 * 60 * 60 * 4);
		}
		else {
			// DEACTIVATE
			this.disposeTelemetryReporter();
		}
	}


	/** Disposes the telemetry reporter and the heartbeat timer.
	 */
	private static disposeTelemetryReporter() {
		if (this.telemetryReporter) {
			// Dispose the telemetry reporter
			const index = this.context.subscriptions.indexOf(this.telemetryReporter);
			if (index > -1) {
				this.context.subscriptions.splice(index, 1);
			}
			this.telemetryReporter.dispose();
			this.telemetryReporter = undefined;
		}

		if (this.heartbeatTimer) {
			// Clear the heartbeat timer
			clearInterval(this.heartbeatTimer);
			this.heartbeatTimer = undefined;
		}
	}


	/** Sends an activation event at start of the extension.
	 */
	private static sendActivated() {
		this.telemetryReporter?.sendTelemetryEvent('activated', {
			extensionVersion: this.context.extension.packageJSON.version,
			os: process.platform,
			vscodeVersion: vscode.version,
		});
	}


	/** Sends a heartbeat event to Application Insights.
	 * @param telemetryReporter The telemetry reporter instance.
	 */
	private static sendHeartbeat() {
		this.telemetryReporter?.sendTelemetryEvent('heartbeat', {
			day: new Date().toISOString().substring(0, 10), // e.g., '2025-05-04'
		});
	}
}