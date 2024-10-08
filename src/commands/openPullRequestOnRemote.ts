import { env, window } from 'vscode';
import { Commands } from '../constants.commands';
import type { Container } from '../container';
import { shortenRevision } from '../git/models/reference';
import { command } from '../system/command';
import { openUrl } from '../system/utils';
import type { CommandContext } from './base';
import { Command } from './base';

export interface OpenPullRequestOnRemoteCommandArgs {
	clipboard?: boolean;
	ref?: string;
	repoPath?: string;
	pr?: { url: string };
}

@command()
export class OpenPullRequestOnRemoteCommand extends Command {
	constructor(private readonly container: Container) {
		super([Commands.OpenPullRequestOnRemote, Commands.CopyRemotePullRequestUrl]);
	}

	protected override preExecute(context: CommandContext, args?: OpenPullRequestOnRemoteCommandArgs) {
		if (context.type === 'viewItem' && (context.node.is('pullrequest') || context.node.is('launchpad-item'))) {
			args = {
				...args,
				pr: context.node.pullRequest != null ? { url: context.node.pullRequest.url } : undefined,
				clipboard: context.command === Commands.CopyRemotePullRequestUrl,
			};
		}

		return this.execute(args);
	}

	async execute(args?: OpenPullRequestOnRemoteCommandArgs) {
		if (args?.pr == null) {
			if (args?.repoPath == null || args?.ref == null) return;

			const remote = await this.container.git.getBestRemoteWithIntegration(args.repoPath);
			if (remote == null) return;

			const provider = await this.container.integrations.getByRemote(remote);
			if (provider == null) return;

			const pr = await provider.getPullRequestForCommit(remote.provider.repoDesc, args.ref);
			if (pr == null) {
				void window.showInformationMessage(`No pull request associated with '${shortenRevision(args.ref)}'`);
				return;
			}

			args = { ...args };
			args.pr = pr;
		}

		if (args.clipboard) {
			await env.clipboard.writeText(args.pr.url);
		} else {
			void openUrl(args.pr.url);
		}
	}
}
