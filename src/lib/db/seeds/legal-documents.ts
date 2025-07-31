import { db } from '../drizzle'
import { adminSettings } from '../schema'
import type { User } from '../schema'

export async function seedLegalDocuments(adminUser: User) {
  console.log('Seeding legal documents...')

  const termsContent = `## 1. Acceptance of Terms

By accessing and using this platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.

## 2. Use License

Permission is granted to temporarily use this platform for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:

- modify or copy the materials
- use the materials for any commercial purpose or for any public display
- attempt to reverse engineer any software contained on this platform
- remove any copyright or other proprietary notations from the materials

## 3. Blockchain Services

Our platform provides blockchain-based subscription services. By using these services, you acknowledge and agree that:

- Blockchain transactions are irreversible once confirmed
- You are responsible for maintaining the security of your wallet and private keys
- Gas fees and network costs are your responsibility
- Service availability depends on blockchain network conditions

## 4. Subscription Terms

Subscriptions are managed through smart contracts on supported blockchain networks. By subscribing:

- You agree to the subscription pricing as displayed at the time of purchase
- Subscriptions automatically renew unless cancelled
- Refunds are subject to the terms encoded in the smart contract
- Plan changes take effect immediately upon blockchain confirmation

## 5. User Accounts

You are responsible for:

- Maintaining the confidentiality of your account
- All activities that occur under your account
- Notifying us immediately of any unauthorized use

## 6. Disclaimer

The materials on this platform are provided on an 'as is' basis. This platform makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.

## 7. Limitations

In no event shall this platform or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this platform, even if this platform or an authorized representative has been notified orally or in writing of the possibility of such damage.

## 8. Privacy

Your use of our platform is also governed by our Privacy Policy. Please review our Privacy Policy, which also governs the Site and informs users of our data collection practices.

## 9. Governing Law

These terms and conditions are governed by and construed in accordance with the laws of the jurisdiction in which the service operates, and you irrevocably submit to the exclusive jurisdiction of the courts in that location.

## 10. Changes to Terms

This platform reserves the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide notice prior to any new terms taking effect.

## 11. Contact Information

If you have any questions about these Terms, please contact us through the platform's support channels.`

  const privacyContent = `## 1. Introduction

Welcome to our platform. We respect your privacy and are committed to protecting your personal data. This privacy policy will inform you about how we look after your personal data when you visit our website and tell you about your privacy rights and how the law protects you.

## 2. Information We Collect

We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:

- **Identity Data:** includes first name, last name, username or similar identifier
- **Contact Data:** includes email address
- **Technical Data:** includes internet protocol (IP) address, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform
- **Usage Data:** includes information about how you use our website and services
- **Blockchain Data:** includes your wallet address and transaction history on supported blockchain networks

## 3. How We Use Your Information

We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:

- To provide and maintain our service
- To notify you about changes to our service
- To provide customer support
- To gather analysis or valuable information so that we can improve our service
- To monitor the usage of our service
- To detect, prevent and address technical issues
- To fulfill smart contract obligations on the blockchain

## 4. Blockchain and Wallet Information

When you connect your blockchain wallet to our platform:

- Your wallet address becomes visible to us and may be stored for service functionality
- Your transaction history on supported networks may be visible due to the public nature of blockchain
- We do not have access to your private keys or seed phrases
- We cannot access your wallet without your explicit permission for each transaction

## 5. Data Security

We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.

## 6. Data Retention

We will only retain your personal data for as long as reasonably necessary to fulfill the purposes we collected it for, including for the purposes of satisfying any legal, regulatory, tax, accounting or reporting requirements.

## 7. Third-Party Services

Our service may contain links to third-party websites or services that are not owned or controlled by us. We use the following third-party services:

- Blockchain networks for transaction processing
- Wallet providers for authentication
- Analytics services to improve our platform

## 8. Your Rights

Under certain circumstances, you have rights under data protection laws in relation to your personal data:

- Request access to your personal data
- Request correction of your personal data
- Request erasure of your personal data
- Object to processing of your personal data
- Request restriction of processing your personal data
- Request transfer of your personal data
- Right to withdraw consent

## 9. International Transfers

As a blockchain-based service, your data may be processed and stored in multiple jurisdictions. By using our service, you consent to the transfer of your information to countries outside of your country of residence.

## 10. Changes to This Privacy Policy

We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.

## 11. Contact Us

If you have any questions about this Privacy Policy, please contact us through the platform's support channels.`

  await db.insert(adminSettings).values([
    {
      category: 'legal',
      key: 'terms_title',
      value: 'Terms of Service',
      updatedByUserId: adminUser.id
    },
    {
      category: 'legal',
      key: 'terms_content',
      value: termsContent.trim(),
      updatedByUserId: adminUser.id
    },
    {
      category: 'legal',
      key: 'terms_updated_at',
      value: new Date().toISOString(),
      updatedByUserId: adminUser.id
    },
    {
      category: 'legal',
      key: 'privacy_title',
      value: 'Privacy Policy',
      updatedByUserId: adminUser.id
    },
    {
      category: 'legal',
      key: 'privacy_content',
      value: privacyContent.trim(),
      updatedByUserId: adminUser.id
    },
    {
      category: 'legal',
      key: 'privacy_updated_at',
      value: new Date().toISOString(),
      updatedByUserId: adminUser.id
    }
  ])

  console.log('Legal documents seeded successfully')
}
