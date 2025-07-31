'use client'

import { useState, useEffect } from 'react'

import {
  Loader2,
  RefreshCw,
  Save,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react'
import { toast } from 'sonner'
import { ZERO_ADDRESS } from 'thirdweb'

import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { LoadingButton } from '@/components/ui/loading-button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiEndpoints } from '@/config/api-endpoints'
import { blockchainConfig } from '@/config/blockchain-config.generated'
import { cn } from '@/lib'

interface PlatformContract {
  id: number
  chainId: number
  chainName: string
  contractType: string
  contractAddress: string
  deployedAt: string
  isActive: boolean
}

interface ContractData {
  contracts: PlatformContract[]
  config: typeof blockchainConfig
}

export function BlockchainConfigManager() {
  const [data, setData] = useState<ContractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [editingContracts, setEditingContracts] = useState<
    Record<number, PlatformContract>
  >({})
  const [savingContract, setSavingContract] = useState<number | null>(null)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const response = await fetch(apiEndpoints.admin.blockchainConfig.base, {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch data')
      const result = await response.json()
      setData(result)
      setEditingContracts({})
    } catch (error) {
      toast.error('Failed to load blockchain configuration')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const response = await fetch(apiEndpoints.admin.blockchainConfig.sync, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ config: blockchainConfig })
      })

      if (!response.ok) throw new Error('Failed to sync configuration')

      const result = await response.json()
      toast.success(`Synced ${result.synced} contract configurations`)
      await fetchData()
    } catch (error) {
      toast.error('Failed to sync blockchain configuration')
      console.error(error)
    } finally {
      setSyncing(false)
    }
  }

  const handleEditContract = (contract: PlatformContract) => {
    setEditingContracts(prev => ({
      ...prev,
      [contract.id]: { ...contract }
    }))
  }

  const handleCancelEdit = (contractId: number) => {
    setEditingContracts(prev => {
      const newState = { ...prev }
      delete newState[contractId]
      return newState
    })
  }

  const handleSaveContract = async (contractId: number) => {
    const contract = editingContracts[contractId]
    if (!contract) return

    setSavingContract(contractId)
    try {
      const response = await fetch(
        apiEndpoints.admin.blockchainConfig.contractById(contractId.toString()),
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            contractAddress: contract.contractAddress,
            isActive: contract.isActive
          })
        }
      )

      if (!response.ok) throw new Error('Failed to update contract')

      toast.success('Contract updated successfully')
      await fetchData()
    } catch (error) {
      toast.error('Failed to update contract')
      console.error(error)
    } finally {
      setSavingContract(null)
    }
  }

  const handleInputChange = (
    contractId: number,
    field: keyof PlatformContract,
    value: any
  ) => {
    setEditingContracts(prev => ({
      ...prev,
      [contractId]: {
        ...prev[contractId],
        [field]: value
      }
    }))
  }

  const copyToClipboard = async (address: string) => {
    await navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  if (loading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    )
  }

  if (!data) {
    return (
      <Alert>
        <AlertCircle className='h-4 w-4' />
        <AlertDescription>
          Failed to load blockchain configuration. Please refresh the page.
        </AlertDescription>
      </Alert>
    )
  }

  const chainEntries = Object.entries(data.config.chains)

  return (
    <div className='space-y-6'>
      {/* Sync Section */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Sync</CardTitle>
          <CardDescription>
            Sync your blockchain configuration file with the database
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-between'>
            <div className='space-y-1'>
              <p className='text-sm font-medium'>
                Blockchain Config: {chainEntries.length} chains configured
              </p>
              <p className='text-muted-foreground text-sm'>
                Database Contracts: {data.contracts.length} contracts stored
              </p>
            </div>
            <LoadingButton
              onClick={handleSync}
              isLoading={syncing}
              loadingText='Syncing...'
              className='gap-2'
            >
              <RefreshCw className='h-4 w-4' />
              Sync Configuration
            </LoadingButton>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Tabs */}
      <Tabs defaultValue='contracts' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='contracts'>Smart Contracts</TabsTrigger>
          <TabsTrigger value='config'>Blockchain Config</TabsTrigger>
        </TabsList>

        {/* Smart Contracts Tab */}
        <TabsContent value='contracts' className='space-y-4'>
          {chainEntries.map(([chainKey, chain]) => {
            const chainContracts = data.contracts.filter(
              c => c.chainId === chain.chainId
            )

            return (
              <Card key={chainKey}>
                <CardHeader>
                  <div className='flex items-center justify-between'>
                    <div className='space-y-1'>
                      <CardTitle className='flex items-center gap-2'>
                        {chain.name}
                        <Badge
                          variant={chain.isTestnet ? 'secondary' : 'default'}
                        >
                          {chain.isTestnet ? 'Testnet' : 'Mainnet'}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Chain ID: {chain.chainId} •{' '}
                        {chain.nativeCurrency.symbol}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {chainContracts.length === 0 ? (
                    <p className='text-muted-foreground text-sm'>
                      No contracts configured for this chain. Click "Sync
                      Configuration" to add them.
                    </p>
                  ) : (
                    <div className='space-y-4'>
                      {chainContracts.map(contract => {
                        const isEditing = !!editingContracts[contract.id]
                        const editingData =
                          editingContracts[contract.id] || contract

                        return (
                          <div
                            key={contract.id}
                            className='space-y-3 rounded-lg border p-4'
                          >
                            <div className='flex items-center justify-between'>
                              <div className='flex items-center gap-2'>
                                <Label className='font-semibold'>
                                  {contract.contractType.replace(/_/g, ' ')}
                                </Label>
                                <Badge
                                  variant={
                                    editingData.isActive
                                      ? 'default'
                                      : 'secondary'
                                  }
                                  className={cn(
                                    'text-xs',
                                    editingData.isActive
                                      ? 'bg-green-500/10 text-green-600'
                                      : ''
                                  )}
                                >
                                  {editingData.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              {!isEditing ? (
                                <Button
                                  variant='outline'
                                  size='sm'
                                  onClick={() => handleEditContract(contract)}
                                >
                                  Edit
                                </Button>
                              ) : (
                                <div className='flex gap-2'>
                                  <Button
                                    variant='outline'
                                    size='sm'
                                    onClick={() =>
                                      handleCancelEdit(contract.id)
                                    }
                                  >
                                    Cancel
                                  </Button>
                                  <LoadingButton
                                    size='sm'
                                    onClick={() =>
                                      handleSaveContract(contract.id)
                                    }
                                    isLoading={savingContract === contract.id}
                                  >
                                    <Save className='h-4 w-4' />
                                  </LoadingButton>
                                </div>
                              )}
                            </div>

                            <div className='space-y-2'>
                              <div className='flex items-center gap-2'>
                                <Input
                                  value={editingData.contractAddress}
                                  onChange={e =>
                                    handleInputChange(
                                      contract.id,
                                      'contractAddress',
                                      e.target.value
                                    )
                                  }
                                  disabled={!isEditing}
                                  placeholder={ZERO_ADDRESS}
                                  className='font-mono text-sm'
                                />
                                <Button
                                  variant='ghost'
                                  size='sm'
                                  onClick={() =>
                                    copyToClipboard(editingData.contractAddress)
                                  }
                                  className='h-9 w-9 p-0'
                                >
                                  {copiedAddress ===
                                  editingData.contractAddress ? (
                                    <Check className='h-4 w-4 text-green-600' />
                                  ) : (
                                    <Copy className='h-4 w-4' />
                                  )}
                                </Button>
                              </div>

                              {isEditing && (
                                <div className='flex items-center gap-2'>
                                  <Label
                                    htmlFor={`status-${contract.id}`}
                                    className='text-sm'
                                  >
                                    Status:
                                  </Label>
                                  <Select
                                    value={editingData.isActive.toString()}
                                    onValueChange={value =>
                                      handleInputChange(
                                        contract.id,
                                        'isActive',
                                        value === 'true'
                                      )
                                    }
                                  >
                                    <SelectTrigger
                                      id={`status-${contract.id}`}
                                      className='w-32'
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value='true'>
                                        Active
                                      </SelectItem>
                                      <SelectItem value='false'>
                                        Inactive
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>

                            <p className='text-muted-foreground text-xs'>
                              Deployed:{' '}
                              {new Date(
                                contract.deployedAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>

        {/* Blockchain Config Tab */}
        <TabsContent value='config' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Current Blockchain Configuration</CardTitle>
              <CardDescription>
                This configuration is generated from your blockchains.yaml file
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-6'>
                <div>
                  <h3 className='mb-2 font-semibold'>Subscription Pricing</h3>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <Label>Pro Plan</Label>
                      <p className='text-2xl font-bold'>
                        ${data.config.subscriptionPricing.pro}
                      </p>
                    </div>
                    <div>
                      <Label>Enterprise Plan</Label>
                      <p className='text-2xl font-bold'>
                        ${data.config.subscriptionPricing.enterprise}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className='mb-4 font-semibold'>Configured Chains</h3>
                  <div className='space-y-4'>
                    {chainEntries.map(([chainKey, chain]) => (
                      <div key={chainKey} className='rounded-lg border p-4'>
                        <div className='mb-2 flex items-center justify-between'>
                          <h4 className='flex items-center gap-2 font-medium'>
                            {chain.name}
                            <Badge
                              variant={
                                chain.isTestnet ? 'secondary' : 'default'
                              }
                            >
                              {chain.isTestnet ? 'Testnet' : 'Mainnet'}
                            </Badge>
                          </h4>
                          <Badge variant='outline'>
                            Chain ID: {chain.chainId}
                          </Badge>
                        </div>
                        <div className='grid grid-cols-2 gap-4 text-sm'>
                          <div>
                            <Label className='text-xs'>RPC URL</Label>
                            <p className='text-muted-foreground break-all'>
                              {chain.rpcUrl}
                            </p>
                          </div>
                          <div>
                            <Label className='text-xs'>Explorer</Label>
                            <p className='text-muted-foreground break-all'>
                              {chain.explorerUrl}
                            </p>
                          </div>
                          <div>
                            <Label className='text-xs'>Native Currency</Label>
                            <p className='text-muted-foreground'>
                              {chain.nativeCurrency.name} (
                              {chain.nativeCurrency.symbol})
                            </p>
                          </div>
                          <div>
                            <Label className='text-xs'>
                              Configured Contracts
                            </Label>
                            <p className='text-muted-foreground'>
                              {
                                Object.keys(chain.contractAddresses || {})
                                  .length
                              }{' '}
                              contracts
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
