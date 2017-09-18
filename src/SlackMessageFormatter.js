const MESSAGE_RESERVED_KEYWORDS = ['channel','group','everyone','here']

class SlackMessageFormatter {

  constructor(dataStore) {
    if (!dataStore)
      throw Error('missing argument: dataStore')
    this.dataStore = dataStore
  }

  // format links and ids
  formatLinks(message) {
    const regex = /<([@#!])?([^>|]+)(?:\|([^>]+))?>/g

    let result = message.replace(regex, (match, type, link, label) => {
      switch (type) {
        case '@':
          if (label)
            return `@${label}`
          const user = this.dataStore.getUserById(link)
          if (user)
            return `@${user.name}`
          break
        case '#':
          if (label)
            return `#${label}`
          const channel = this.dataStore.getChannelById(link)
          if (channel)
            return `#${channel.name}`
          break
        case '!':
          if (link in MESSAGE_RESERVED_KEYWORDS)
            return `@${link}`
          if (label)
            return label
          return match
          break
        default:
          link = link.replace(/^mailto:/, '')
          if (label && -1 === link.indexOf(label) )
            return  `${label} (${link})`
          return link
          break
      }
    })

    result = result.replace(/&lt;/g, '<')
    result = result.replace(/&gt;/g, '>')
    result = result.replace(/&amp;/g, '&')

    return result
  }

  // flattens message text and attachments into a multi-line string
  flattenMessage(metaMsg) {
    const results = []
    if (metaMsg.text)
      results.push(metaMsg.text)

    // append all attachments
    const attachments = metaMsg.attachments || []
    for (const key in attachments) {
      if (attachments.hasOwnProperty(key))
        results.push(attachments[key].fallback)
    }

    return results.join('\n')
  }

  // formats an incoming Slack message
  processIncomingMessageText(metaMsg) {
    return this.formatLinks(this.flattenMessage(metaMsg))
  }
}

module.exports = SlackMessageFormatter