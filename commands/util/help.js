const Commando = require('discord.js-commando'),
  Helper = require('../../app/helper'),
  {CommandGroup} = require('../../app/constants'),
  {MessageEmbed} = require('discord.js'),
  {stripIndents, oneLine} = require('common-tags'),
  settings = require('../../data/settings');

class HelpCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: 'help',
      group: CommandGroup.UTIL,
      memberName: 'help',
      aliases: ['commands'],
      description: 'Displays a list of available commands, or detailed information for a specified command.',
      details: oneLine`
				The command may be part of a command name or a whole command name.
				If it isn't specified, all available commands will be listed.
			`,
      examples: ['help', 'help prefix'],
      guarded: true,

      args: [
        {
          key: 'command',
          prompt: 'Which command would you like to view the help for?',
          type: 'string',
          default: ''
        }
      ]
    });
  }

  async run(message, args) {
    const groups = this.client.registry.groups,
      commands = this.client.registry.findCommands(args.command, false, message),
      showAll = args.command && args.command.toLowerCase() === 'all';

    let embed = new MessageEmbed();
    embed.setColor('GREEN');

    if (args.command && !showAll) {
      if (commands.length === 1) {
        embed.setTitle(`Command: ${commands[0].name}\n`);
        embed.setDescription(stripIndents`
					${oneLine`
						${commands[0].description}
						${commands[0].guildOnly ? ' (usable only in public channels)' : ''}
					`}`);

        embed.addField('**Format**',
          `${message.anyUsage(`${commands[0].name}${commands[0].format ? ` ${commands[0].format}` : ''}`,
            message.guild ? message.guild.commandPrefix : message.client.options.commandPrefix,
            null)}`);

        if (commands[0].aliases.length > 0) {
          embed.addField('**Aliases**', commands[0].aliases.join('\n'));
        }

        if (commands[0].details) {
          embed.addField('**Details**', commands[0].details);
        }

        if (commands[0].examples) {
          embed.addField('**Examples**', commands[0].examples
            .map(example => example.trim())
            .join('\n'));
        }

        const messages = [];
        try {
          messages.push(await message.direct({embed}));
          if (message.channel.type !== 'dm') messages.push(await message.reply('Sent you a DM with information.'));
        } catch (err) {
          messages.push(await message.reply('Unable to send you the help DM. You probably have DMs disabled.'));
        }
        return messages;
      } else if (commands.length > 1) {
        return message.reply(Commando.util.disambiguation(commands, 'commands'));
      } else {
        return message.reply(
          `Unable to identify command. Use ${message.usage(
            null, message.channel.type === 'dm' ? null : undefined, message.channel.type === 'dm' ? null : undefined
          )} to view the list of all commands.`
        );
      }
    } else {
      const messages = [];
      try {
        embed.setTitle('All commands');
        embed.setDescription(`Begin all commands with \`${message.client.options.commandPrefix}\` - for example, \`${message.client.options.commandPrefix}join\`.`);
        embed.setFooter(`Use ${this.usage('<command>', null, null)} to view detailed information about a specific command.`);

        const groupsToShow = groups
          .filter(group => group.commands.size > 0 &&
            ((showAll && (Helper.isManagement(message) || Helper.isBotManagement(message))) || settings.helpGroups.includes(group.id)));

        const fields = [];

        for (const group of groupsToShow.values()) {
          let fieldName = `**${group.name}**`,
            fieldContents = '';

          for (const command of [...group.commands.values()]
            .filter(cmd => !cmd.hidden && (showAll || cmd.isUsable(message)))) {
            const line = `**${command.name}**: ${command.description}`;
            if (fieldContents.length + line.length > 1024) {
              fields.push({fieldName, fieldContents});
              if (fieldName.indexOf(' (continued)' === -1)) {
                fieldName = fieldName + ' (continued)';
              }
              fieldContents = line;
            } else {
              fieldContents += '\n' + line;
            }
          }

          if (fieldContents.length > 0) {
            fields.push({fieldName, fieldContents});
          }
        }

        for (const {fieldName, fieldContents} of fields) {
          embed.addField(fieldName, fieldContents);

          if (embed.length > 6000) {
            embed.spliceField(embed.fields.length - 1, 1);
            embed.setFooter('');

            const msg = await message.direct({embed});
            messages.push(msg);

            embed = new MessageEmbed();
            embed.setColor('GREEN');
            embed.setFooter(`Use ${this.usage('<command>', null, null)} to view detailed information about a specific command.`);
            embed.addField(fieldName, fieldContents);
          }
        }

        messages.push(await message.direct({embed}));

        if (message.channel.type !== 'dm') messages.push(await message.reply('Sent you a DM with information.'));
      } catch (err) {
        messages.push(await message.reply('Unable to send you the help DM. You probably have DMs disabled.'));
      }
      return messages;
    }
  }
}

module.exports = HelpCommand;
