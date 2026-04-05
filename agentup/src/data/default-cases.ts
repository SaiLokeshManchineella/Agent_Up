import type { CaseFormData } from '@/types';

export const defaultCases: (CaseFormData & { isDefault: true })[] = [
  {
    title: 'Unexpected Charge on Statement',
    scenario:
      'The customer noticed a $49.99 charge on their latest statement that they don\'t recognize. They subscribed to a basic plan at $19.99/month and believe they were incorrectly billed for a premium upgrade they never requested. The customer has been with the company for 2 years and has never had billing issues before.',
    openingMessage:
      'Hi, I just checked my statement and there\'s a charge of $49.99 that I definitely didn\'t authorize. I\'m only supposed to be paying $19.99 a month. Can someone explain this?',
    channel: 'chat',
    topic: 'Billing',
    difficulty: 'Beginner',
    isDefault: true,
  },
  {
    title: 'Internet Outage — Furious Customer',
    scenario:
      'The customer has been without internet for 3 days. They work from home and have already missed important meetings. They\'ve called twice before and were told each time it would be fixed within 24 hours. They are extremely frustrated and angry. The actual issue is a regional outage affecting their area, with an estimated fix time of 12 more hours.',
    openingMessage:
      'This is the THIRD time I\'m calling about this! I\'ve been without internet for three days now and I work from home! Every time I call, someone tells me it\'ll be fixed in 24 hours and NOTHING happens. I\'ve had it with this company!',
    channel: 'call',
    topic: 'De-escalation',
    difficulty: 'Advanced',
    isDefault: true,
  },
  {
    title: 'Cancel My Subscription',
    scenario:
      'The customer wants to cancel their subscription because they feel they\'re not getting enough value for the price. They\'ve been a customer for 6 months and use the service occasionally but not enough to justify the $29.99/month cost. There is a retention offer available: 50% off for 3 months.',
    openingMessage:
      'I\'d like to cancel my subscription please. I just don\'t use it enough to keep paying for it every month.',
    channel: 'both',
    topic: 'Retention',
    difficulty: 'Intermediate',
    isDefault: true,
  },
  {
    title: "Can't Set Up New Router",
    scenario:
      'The customer just received a new router and is having trouble setting it up. They are not very tech-savvy. The router needs to be connected to the modem via ethernet, then they need to access the setup page at 192.168.1.1 using the default credentials on the bottom of the router. The customer has plugged it in but the lights are blinking orange instead of green.',
    openingMessage:
      'Hi, I just got my new router delivered today and I\'m trying to set it up but it\'s not working. The lights are blinking orange and I can\'t get online. I\'m not great with technology so I could really use some help.',
    channel: 'chat',
    topic: 'Technical',
    difficulty: 'Beginner',
    isDefault: true,
  },
  {
    title: 'Demand to Speak to Manager',
    scenario:
      'The customer was charged a $200 early termination fee for cancelling a service they claim they were told had no contract. They are furious and demanding to speak to a manager immediately. The agent cannot transfer to a manager directly but can escalate through a callback within 2 hours. The fee is valid per the signed agreement, but a one-time courtesy waiver is possible.',
    openingMessage:
      'I want to speak to your manager RIGHT NOW. I was just charged $200 for cancelling a service I was TOLD had no contract. This is fraud and I\'m not going to deal with some phone rep about this. Get me a manager!',
    channel: 'call',
    topic: 'De-escalation',
    difficulty: 'Advanced',
    isDefault: true,
  },
];
