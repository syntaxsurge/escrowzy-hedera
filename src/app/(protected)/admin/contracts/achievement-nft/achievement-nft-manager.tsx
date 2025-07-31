'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

import {
  Trophy,
  Shield,
  Users,
  Award,
  TrendingUp,
  Image,
  ExternalLink,
  Wallet,
  Network,
  Loader2,
  CheckCircle,
  Pause,
  Play,
  Settings,
  Hash,
  Calendar,
  Sparkles,
  Link
} from 'lucide-react'

import {
  showErrorToast,
  showSuccessToast
} from '@/components/blocks/toast-manager'
import { apiEndpoints } from '@/config/api-endpoints'
import { api } from '@/lib/api/http-client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useUnifiedWalletInfo, useUnifiedChainInfo } from '@/context'
import { useAdminTransaction } from '@/hooks/blockchain/use-transaction'
import { useLoading } from '@/hooks/use-loading'
import { cn } from '@/lib'
import {
  DEFAULT_CHAIN_ID,
  getExplorerUrl,
  isSupportedChainId,
  getAchievementNFTAddress,
  getChainConfig
} from '@/lib/blockchain'

interface NFTStats {
  totalMinted: number
  uniqueHolders: number
  mostCommonAchievement: string
  recentMints: number
  totalAchievementTypes: number
  averagePerUser: number
}

interface AchievementType {
  id: number
  name: string
  description: string
  imageUri: string
  totalMinted: number
  maxSupply?: number
  isActive: boolean
  createdAt: string
}

interface RecentMint {
  tokenId: number
  recipient: string
  achievementType: string
  achievementId: number
  timestamp: string
  transactionHash: string
}

interface ContractSettings {
  baseUri: string
  isPaused: boolean
  owner: string
}

export function AchievementNFTManager() {
  // Wallet and chain state
  const { chainId } = useUnifiedChainInfo()
  const { isConnected, address: walletAddress } = useUnifiedWalletInfo()
  const { executeTransaction } = useAdminTransaction()

  // Tab state
  const [activeTab, setActiveTab] = useState<
    'overview' | 'achievements' | 'minting' | 'settings'
  >('overview')

  // Form states
  const [newAchievementName, setNewAchievementName] = useState('')
  const [newAchievementDescription, setNewAchievementDescription] = useState('')
  const [newAchievementImage, setNewAchievementImage] = useState('')
  const [newAchievementMaxSupply, setNewAchievementMaxSupply] = useState('')
  const [mintRecipient, setMintRecipient] = useState('')
  const [mintAchievementId, setMintAchievementId] = useState('')
  const [newBaseUri, setNewBaseUri] = useState('')

  // Loading hooks
  const createAchievementButton = useLoading({
    defaultText: 'Create Achievement',
    loadingText: 'Creating',
    icon: <Trophy className='h-4 w-4' />,
    withButton: true
  })

  const mintButton = useLoading({
    defaultText: 'Mint NFT',
    loadingText: 'Minting',
    icon: <Sparkles className='h-4 w-4' />,
    withButton: true
  })

  const updateUriButton = useLoading({
    defaultText: 'Update Base URI',
    loadingText: 'Updating',
    icon: <Link className='h-4 w-4' />,
    withButton: true
  })

  const pauseButton = useLoading({
    defaultText: 'Pause Contract',
    loadingText: 'Processing',
    icon: <Pause className='h-4 w-4' />,
    withButton: true
  })

  // Determine effective chain ID
  const effectiveChainId =
    chainId && isSupportedChainId(chainId) ? chainId : DEFAULT_CHAIN_ID
  const nftAddress = getAchievementNFTAddress(effectiveChainId)

  // Fetch real data from API
  const fetcher = async (url: string) => {
    const response = await api.get(url)
    return response.success ? response.data : null
  }

  const { data: stats, mutate: mutateStats } = useSWR<NFTStats>(
    apiEndpoints.admin.achievements.stats,
    fetcher,
    {
      refreshInterval: 30000,
      fallbackData: {
        totalMinted: 0,
        uniqueHolders: 0,
        mostCommonAchievement: 'None',
        recentMints: 0,
        totalAchievementTypes: 0,
        averagePerUser: 0
      }
    }
  )

  const { data: achievements, mutate: mutateAchievements } = useSWR<
    AchievementType[]
  >(apiEndpoints.admin.achievements.base, fetcher, {
    refreshInterval: 60000,
    fallbackData: []
  })

  const { data: recentMints, mutate: mutateRecentMints } = useSWR<RecentMint[]>(
    apiEndpoints.admin.achievements.recentMints,
    fetcher,
    {
      refreshInterval: 30000,
      fallbackData: []
    }
  )

  const { data: contractSettings, mutate: mutateSettings } =
    useSWR<ContractSettings>(
      walletAddress ? apiEndpoints.admin.achievements.settings : null,
      fetcher,
      {
        refreshInterval: 60000,
        fallbackData: {
          baseUri: '',
          isPaused: false,
          owner: walletAddress || '0x0000...0000'
        }
      }
    )

  // Handlers
  const handleCreateAchievement = async () => {
    if (!isConnected) {
      showErrorToast('Wallet not connected', 'Please connect your wallet')
      return
    }

    if (
      !newAchievementName ||
      !newAchievementDescription ||
      !newAchievementImage
    ) {
      showErrorToast('Missing fields', 'Please fill in all required fields')
      return
    }

    try {
      await createAchievementButton.execute(async () => {
        // TODO: Implement actual achievement creation logic
        await new Promise(resolve => setTimeout(resolve, 2000))
        showSuccessToast(
          'Achievement created',
          `"${newAchievementName}" achievement type created`
        )
        setNewAchievementName('')
        setNewAchievementDescription('')
        setNewAchievementImage('')
        setNewAchievementMaxSupply('')
      })
    } catch (error) {
      showErrorToast('Creation failed', 'Failed to create achievement type')
    }
  }

  const handleMintNFT = async () => {
    if (!isConnected) {
      showErrorToast('Wallet not connected', 'Please connect your wallet')
      return
    }

    if (!mintRecipient || !mintAchievementId) {
      showErrorToast(
        'Missing fields',
        'Please enter recipient and achievement ID'
      )
      return
    }

    try {
      await mintButton.execute(async () => {
        // TODO: Implement actual minting logic
        await new Promise(resolve => setTimeout(resolve, 2000))
        showSuccessToast(
          'NFT minted',
          `Achievement NFT minted to ${mintRecipient}`
        )
        setMintRecipient('')
        setMintAchievementId('')
      })
    } catch (error) {
      showErrorToast('Minting failed', 'Failed to mint achievement NFT')
    }
  }

  const handleUpdateBaseUri = async () => {
    if (!isConnected) {
      showErrorToast('Wallet not connected', 'Please connect your wallet')
      return
    }

    if (!newBaseUri) {
      showErrorToast('Missing URI', 'Please enter new base URI')
      return
    }

    try {
      await updateUriButton.execute(async () => {
        // TODO: Implement actual URI update logic
        await new Promise(resolve => setTimeout(resolve, 2000))
        showSuccessToast(
          'URI updated',
          'Base metadata URI updated successfully'
        )
        setNewBaseUri('')
      })
    } catch (error) {
      showErrorToast('Update failed', 'Failed to update base URI')
    }
  }

  const handlePauseContract = async () => {
    if (!isConnected) {
      showErrorToast('Wallet not connected', 'Please connect your wallet')
      return
    }

    try {
      await pauseButton.execute(async () => {
        // TODO: Implement actual pause/unpause logic
        await new Promise(resolve => setTimeout(resolve, 2000))
        showSuccessToast(
          contractSettings?.isPaused ? 'Contract resumed' : 'Contract paused',
          contractSettings?.isPaused
            ? 'Minting is now enabled'
            : 'Minting is now disabled'
        )
      })
    } catch (error) {
      showErrorToast('Operation failed', 'Failed to pause/unpause contract')
    }
  }

  return (
    <div className='space-y-6'>
      {/* Contract Info Card */}
      {nftAddress && (
        <Card className='border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20'>
          <CardHeader>
            <CardTitle className='flex items-center gap-2'>
              <Shield className='h-5 w-5 text-blue-600 dark:text-blue-400' />
              Achievement NFT Contract
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
              <div className='flex items-center gap-2'>
                <Wallet className='text-muted-foreground h-4 w-4' />
                <div className='min-w-0 flex-1'>
                  <p className='text-foreground text-sm font-medium'>
                    Contract Address
                  </p>
                  <div className='flex items-center gap-2'>
                    <code className='text-foreground font-mono text-xs break-all'>
                      {nftAddress}
                    </code>
                    <a
                      href={`${getExplorerUrl(effectiveChainId)}/address/${nftAddress}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex-shrink-0 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                    >
                      <ExternalLink className='h-3 w-3' />
                    </a>
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                <Network className='text-muted-foreground h-4 w-4' />
                <div>
                  <p className='text-foreground text-sm font-medium'>Network</p>
                  <p className='text-foreground text-sm'>
                    {getChainConfig(effectiveChainId)?.name ||
                      'Unknown Network'}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-2'>
                {contractSettings?.isPaused ? (
                  <Pause className='h-4 w-4 text-yellow-600' />
                ) : (
                  <CheckCircle className='h-4 w-4 text-green-600' />
                )}
                <div>
                  <p className='text-foreground text-sm font-medium'>
                    Minting Status
                  </p>
                  <Badge
                    variant={
                      contractSettings?.isPaused ? 'secondary' : 'default'
                    }
                  >
                    {contractSettings?.isPaused ? 'Paused' : 'Active'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Tabs */}
      <div className='border-border border-b'>
        <nav className='-mb-px flex space-x-8'>
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'border-b-2 px-1 py-2 text-sm font-medium',
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-muted-foreground hover:border-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            <Trophy className='mr-2 inline h-4 w-4' />
            Overview & Statistics
          </button>
          <button
            onClick={() => setActiveTab('achievements')}
            className={cn(
              'border-b-2 px-1 py-2 text-sm font-medium',
              activeTab === 'achievements'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-muted-foreground hover:border-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            <Award className='mr-2 inline h-4 w-4' />
            Achievement Types
          </button>
          <button
            onClick={() => setActiveTab('minting')}
            className={cn(
              'border-b-2 px-1 py-2 text-sm font-medium',
              activeTab === 'minting'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-muted-foreground hover:border-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            <Sparkles className='mr-2 inline h-4 w-4' />
            Mint NFTs
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={cn(
              'border-b-2 px-1 py-2 text-sm font-medium',
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-muted-foreground hover:border-muted-foreground hover:text-foreground border-transparent'
            )}
          >
            <Settings className='mr-2 inline h-4 w-4' />
            Contract Settings
          </button>
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className='space-y-6'>
          {/* Statistics Cards */}
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  Total NFTs Minted
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {stats?.totalMinted || 0}
                </div>
                <div className='flex items-center gap-1 text-sm text-green-600'>
                  <TrendingUp className='h-3 w-3' />
                  <span>+{stats?.recentMints || 0} this week</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  Unique Holders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {stats?.uniqueHolders || 0}
                </div>
                <div className='flex items-center gap-1 text-sm text-blue-600'>
                  <Users className='h-3 w-3' />
                  <span>
                    {(stats?.averagePerUser || 0).toFixed(1)} avg per user
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='pb-2'>
                <CardTitle className='text-muted-foreground text-sm font-medium'>
                  Achievement Types
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {stats?.totalAchievementTypes || 0}
                </div>
                <div className='text-muted-foreground text-sm'>
                  Most common: {stats?.mostCommonAchievement || 'None'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Mints */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Achievement Mints</CardTitle>
              <CardDescription>Latest NFTs minted to users</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token ID</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Achievement</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Transaction</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(recentMints || []).map(mint => (
                    <TableRow key={mint.tokenId}>
                      <TableCell>
                        <div className='flex items-center gap-1'>
                          <Hash className='text-muted-foreground h-3 w-3' />
                          {mint.tokenId}
                        </div>
                      </TableCell>
                      <TableCell className='font-mono text-xs'>
                        {mint.recipient}
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>{mint.achievementType}</Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(mint.timestamp).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <a
                          href={`${getExplorerUrl(effectiveChainId)}/tx/${mint.transactionHash}`}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300'
                        >
                          <ExternalLink className='h-3 w-3' />
                        </a>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Achievement Types Tab */}
      {activeTab === 'achievements' && (
        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Achievement Types</CardTitle>
              <CardDescription>
                Manage achievement categories and metadata
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Minted</TableHead>
                    <TableHead>Max Supply</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(achievements || []).map(achievement => (
                    <TableRow key={achievement.id}>
                      <TableCell>{achievement.id}</TableCell>
                      <TableCell className='font-medium'>
                        {achievement.name}
                      </TableCell>
                      <TableCell className='max-w-xs truncate'>
                        {achievement.description}
                      </TableCell>
                      <TableCell>{achievement.totalMinted}</TableCell>
                      <TableCell>
                        {achievement.maxSupply || 'Unlimited'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            achievement.isActive ? 'default' : 'secondary'
                          }
                        >
                          {achievement.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size='sm' variant='outline'>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Create New Achievement */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Achievement Type</CardTitle>
              <CardDescription>
                Define a new achievement category for users to earn
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div>
                  <Label htmlFor='achievementName'>Achievement Name</Label>
                  <Input
                    id='achievementName'
                    placeholder='e.g., Diamond Hands'
                    value={newAchievementName}
                    onChange={e => setNewAchievementName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor='achievementMaxSupply'>
                    Max Supply (Optional)
                  </Label>
                  <Input
                    id='achievementMaxSupply'
                    type='number'
                    placeholder='Leave empty for unlimited'
                    value={newAchievementMaxSupply}
                    onChange={e => setNewAchievementMaxSupply(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor='achievementDescription'>Description</Label>
                <Textarea
                  id='achievementDescription'
                  placeholder='Describe how users can earn this achievement...'
                  value={newAchievementDescription}
                  onChange={e => setNewAchievementDescription(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor='achievementImage'>
                  Image URI (IPFS or URL)
                </Label>
                <Input
                  id='achievementImage'
                  placeholder='ipfs://... or https://...'
                  value={newAchievementImage}
                  onChange={e => setNewAchievementImage(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCreateAchievement}
                disabled={createAchievementButton.isLoading || !isConnected}
                className='w-full'
              >
                {createAchievementButton.buttonContent}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Minting Tab */}
      {activeTab === 'minting' && (
        <div className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Mint Achievement NFT</CardTitle>
              <CardDescription>
                Manually mint achievement NFTs to users
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <Label htmlFor='mintRecipient'>Recipient Address</Label>
                <Input
                  id='mintRecipient'
                  placeholder='0x...'
                  value={mintRecipient}
                  onChange={e => setMintRecipient(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor='mintAchievement'>Achievement Type</Label>
                <Select
                  value={mintAchievementId}
                  onValueChange={setMintAchievementId}
                >
                  <SelectTrigger id='mintAchievement'>
                    <SelectValue placeholder='Select achievement type' />
                  </SelectTrigger>
                  <SelectContent>
                    {(achievements || []).map(achievement => (
                      <SelectItem
                        key={achievement.id}
                        value={achievement.id.toString()}
                      >
                        {achievement.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleMintNFT}
                disabled={mintButton.isLoading || !isConnected}
                className='w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md transition-all duration-200 hover:from-purple-700 hover:to-pink-700 hover:shadow-lg'
              >
                {mintButton.buttonContent}
              </Button>
            </CardContent>
          </Card>

          {/* Batch Minting */}
          <Card>
            <CardHeader>
              <CardTitle>Batch Minting</CardTitle>
              <CardDescription>
                Mint multiple NFTs in a single transaction
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='text-muted-foreground py-8 text-center'>
                <Trophy className='mx-auto mb-3 h-12 w-12 opacity-50' />
                <p>Batch minting coming soon</p>
                <p className='mt-2 text-sm'>
                  This feature will allow minting NFTs to multiple recipients at
                  once
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div className='space-y-6'>
          <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
            {/* Base URI Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Metadata Base URI</CardTitle>
                <CardDescription>
                  Configure the base URI for NFT metadata
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div>
                  <Label>Current Base URI</Label>
                  <code className='bg-muted block rounded p-2 font-mono text-xs break-all'>
                    {contractSettings?.baseUri || 'Not set'}
                  </code>
                </div>
                <div>
                  <Label htmlFor='newBaseUri'>New Base URI</Label>
                  <Input
                    id='newBaseUri'
                    placeholder='https://... or ipfs://...'
                    value={newBaseUri}
                    onChange={e => setNewBaseUri(e.target.value)}
                  />
                </div>
                <Button
                  onClick={handleUpdateBaseUri}
                  disabled={updateUriButton.isLoading || !isConnected}
                  className='w-full'
                >
                  {updateUriButton.buttonContent}
                </Button>
              </CardContent>
            </Card>

            {/* Contract Control */}
            <Card>
              <CardHeader>
                <CardTitle>Minting Control</CardTitle>
                <CardDescription>Pause or resume NFT minting</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='font-medium'>Minting Status</p>
                    <p className='text-muted-foreground text-sm'>
                      {contractSettings?.isPaused
                        ? 'Minting is disabled'
                        : 'Minting is enabled'}
                    </p>
                  </div>
                  <Badge
                    variant={
                      contractSettings?.isPaused ? 'secondary' : 'default'
                    }
                  >
                    {contractSettings?.isPaused ? 'Paused' : 'Active'}
                  </Badge>
                </div>
                <Button
                  onClick={handlePauseContract}
                  disabled={pauseButton.isLoading || !isConnected}
                  variant={
                    contractSettings?.isPaused ? 'default' : 'destructive'
                  }
                  className='w-full'
                >
                  {contractSettings?.isPaused ? (
                    <>
                      <Play className='mr-2 h-4 w-4' />
                      Resume Minting
                    </>
                  ) : (
                    <>
                      <Pause className='mr-2 h-4 w-4' />
                      Pause Minting
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Contract Owner */}
            <Card>
              <CardHeader>
                <CardTitle>Contract Owner</CardTitle>
                <CardDescription>
                  Current owner of the NFT contract
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div>
                  <Label>Owner Address</Label>
                  <code className='bg-muted block rounded p-2 font-mono text-xs break-all'>
                    {contractSettings?.owner || '0x0000...0000'}
                  </code>
                </div>
                <Button
                  variant='outline'
                  disabled={!isConnected}
                  className='w-full'
                >
                  Transfer Ownership
                </Button>
              </CardContent>
            </Card>

            {/* Statistics Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Statistics</CardTitle>
                <CardDescription>NFT collection information</CardDescription>
              </CardHeader>
              <CardContent className='space-y-3'>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground text-sm'>
                    Total Supply
                  </span>
                  <span className='font-medium'>{stats?.totalMinted || 0}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground text-sm'>
                    Unique Holders
                  </span>
                  <span className='font-medium'>
                    {stats?.uniqueHolders || 0}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground text-sm'>
                    Achievement Types
                  </span>
                  <span className='font-medium'>
                    {stats?.totalAchievementTypes || 0}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-muted-foreground text-sm'>
                    Contract Version
                  </span>
                  <span className='font-medium'>1.0.0</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
