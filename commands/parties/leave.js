"use strict";

const log = require('loglevel').getLogger('LeaveCommand'),
  Commando = require('discord.js-commando'),
  {CommandGroup} = require('../../app/constants'),
  Helper = require('../../app/helper'),
  PartyManager = require('../../app/party-manager'),
  {PartyType} = require('../../app/constants'),
  settings = require('../../data/settings');

class LeaveCommand extends Commando.Command {
  constructor(client) {
    super(client, {
      name: 'leave',
      group: CommandGroup.BASIC_RAID,
      memberName: 'leave',
      aliases: ['part', 'not-interested', 'uninterested', 'meh', 'bye', 'megaleave'],
      description: 'Leaves an existing raid (completely removes you from its attendees list).\n',
      details: 'Use this command to leave a raid if you can no longer attend it.',
      examples: ['\t!leave', '\t!part'],
      guildOnly: true
    });

    client.dispatcher.addInhibitor(message => {
      if (!!message.command && message.command.name === 'leave' &&
        !PartyManager.validParty(message.channel.id)) {
        return ['invalid-channel', message.reply('Leave a raid from its raid channel!')];
      }
      return false;
    });
  }

  async run(message, args) {
    const raid = PartyManager.getParty(message.channel.id);
    let info = await raid.removeAttendee(message.member.id);

    if (!info.error && raid.type === PartyType.RAID_TRAIN) {
      if (raid.conductor && raid.conductor.id === message.member.id) {
        info = await raid.setConductor(null);
      }
    }

    if (!info.error) {
      message.react(Helper.getEmoji(settings.emoji.thumbsUp) || '👍')
        .catch(err => log.error(err));

      raid.refreshStatusMessages()
        .catch(err => log.error(err));
    } else {
      message.reply(info.error)
        .catch(err => log.error(err));
    }
  }
}

module.exports = LeaveCommand;
