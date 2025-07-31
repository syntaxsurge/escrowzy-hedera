'use client'

import Link from 'next/link'
import { useState } from 'react'

import {
  Copy,
  CheckCircle,
  Key,
  Shield,
  ChevronRight,
  Zap,
  Terminal,
  Code2,
  Cpu,
  Database,
  Lock,
  CheckCircle2,
  Server,
  GitBranch,
  FileCode,
  AlertTriangle,
  Info,
  Clock,
  Activity
} from 'lucide-react'

import { Footer } from '@/components/layout/footer'
import Header from '@/components/layout/header'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiEndpoints } from '@/config/api-endpoints'
import { refreshIntervals, appRoutes } from '@/config/app-routes'
import { envPublic } from '@/config/env.public'
import { cn } from '@/lib'

interface CodeExample {
  language: string
  code: string
}

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  authentication: boolean
  requestBody?: any
  responseExample?: any
  codeExamples?: CodeExample[]
}

function CodeBlock({
  code,
  language,
  onCopy
}: {
  code: string
  language: string
  onCopy?: () => void
}) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    if (onCopy) onCopy()
    setTimeout(() => setCopied(false), refreshIntervals.FAST)
  }

  return (
    <div className='space-y-1'>
      <div className='flex items-center justify-between'>
        <span className='text-xs font-medium text-gray-500 dark:text-gray-400'>
          {language}
        </span>
      </div>
      <div className='group relative overflow-hidden rounded-xl border border-purple-500/30 bg-black backdrop-blur-sm'>
        <div className='absolute inset-0 bg-gradient-to-br from-purple-900/10 to-blue-900/10' />
        <pre className='relative overflow-x-auto p-4 text-sm text-cyan-300'>
          <code>{code}</code>
        </pre>
        <div className='absolute top-2 right-2 z-10'>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleCopy}
            className='bg-gray-800/50 text-gray-300 hover:bg-gray-700/50 hover:text-gray-200'
          >
            {copied ? (
              <>
                <CheckCircle className='mr-1 h-4 w-4 text-green-400' />
                <span className='text-xs'>Copied</span>
              </>
            ) : (
              <>
                <Copy className='mr-1 h-4 w-4' />
                <span className='text-xs'>Copy</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function EndpointCard({
  endpoint,
  onCopy
}: {
  endpoint: Endpoint
  onCopy: () => void
}) {
  const methodColors = {
    GET: 'from-blue-500 to-cyan-500',
    POST: 'from-green-500 to-emerald-500',
    PUT: 'from-yellow-500 to-orange-500',
    DELETE: 'from-red-500 to-pink-500'
  }

  const methodIcons = {
    GET: Database,
    POST: FileCode,
    PUT: GitBranch,
    DELETE: AlertTriangle
  }

  const MethodIcon = methodIcons[endpoint.method]

  return (
    <div className='group relative space-y-4 overflow-hidden rounded-xl border border-gray-200 bg-white p-6 backdrop-blur-sm transition-all hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900/50 dark:hover:border-gray-600'>
      <div className='flex items-center gap-3'>
        <span
          className={cn(
            'flex items-center gap-2 rounded-lg bg-gradient-to-r px-3 py-1 text-sm font-bold text-white shadow-lg',
            methodColors[endpoint.method]
          )}
        >
          <MethodIcon className='h-4 w-4' />
          {endpoint.method}
        </span>
        <code className='flex-1 rounded-lg border border-purple-500/30 bg-black px-3 py-1 text-sm text-purple-300'>
          {endpoint.path}
        </code>
        {endpoint.authentication && (
          <Badge
            variant='outline'
            className='border-yellow-600 text-yellow-600'
          >
            <Lock className='mr-1 h-3 w-3' />
            Auth Required
          </Badge>
        )}
      </div>

      <p className='text-gray-700 dark:text-gray-300'>{endpoint.description}</p>

      {endpoint.requestBody && (
        <div className='space-y-2'>
          <h4 className='flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200'>
            <Cpu className='mr-2 h-4 w-4 text-gray-500 dark:text-gray-400' />
            Request Body
          </h4>
          <CodeBlock
            code={JSON.stringify(endpoint.requestBody, null, 2)}
            language='JSON'
            onCopy={onCopy}
          />
        </div>
      )}

      {endpoint.responseExample && (
        <div className='space-y-2'>
          <h4 className='flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200'>
            <Server className='mr-2 h-4 w-4 text-gray-500 dark:text-gray-400' />
            Response Example
          </h4>
          <CodeBlock
            code={JSON.stringify(endpoint.responseExample, null, 2)}
            language='JSON'
            onCopy={onCopy}
          />
        </div>
      )}

      {endpoint.codeExamples && (
        <div className='space-y-2'>
          <h4 className='flex items-center text-sm font-semibold text-gray-800 dark:text-gray-200'>
            <Code2 className='mr-2 h-4 w-4 text-gray-500 dark:text-gray-400' />
            Code Examples
          </h4>
          <Tabs
            defaultValue={endpoint.codeExamples[0].language}
            className='rounded-xl border border-purple-500/30 bg-black p-2'
          >
            <TabsList className='grid w-full grid-cols-3 gap-1 bg-gray-100 dark:bg-purple-900/30'>
              {endpoint.codeExamples.map(example => (
                <TabsTrigger
                  key={example.language}
                  value={example.language}
                  className='text-gray-700 hover:text-gray-900 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-pink-600 data-[state=active]:text-white dark:text-gray-300 dark:hover:text-white'
                >
                  {example.language}
                </TabsTrigger>
              ))}
            </TabsList>
            {endpoint.codeExamples.map(example => (
              <TabsContent
                key={example.language}
                value={example.language}
                className='mt-2'
              >
                <CodeBlock
                  code={example.code}
                  language={example.language}
                  onCopy={onCopy}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}
    </div>
  )
}

export default function ApiDocsPage() {
  const endpoints: Endpoint[] = [
    {
      method: 'POST',
      path: '/api/v1/escrow/create',
      description: 'Create a new escrow transaction',
      authentication: true,
      requestBody: {
        seller: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        amount: '1.5',
        disputeWindow: 86400,
        metadata: 'Purchase of digital goods',
        autoFund: false
      },
      responseExample: {
        data: {
          escrow: {
            id: 'escrow_1234567890',
            buyer: '0x123...',
            seller: '0x742...',
            amount: '1.5',
            status: 'CREATED',
            createdAt: '2024-01-15T10:30:00Z'
          },
          instructions: {
            fundingAddress: '0xabc...',
            requiredAmount: '1.5'
          }
        }
      },
      codeExamples: [
        {
          language: 'JavaScript',
          code: `const response = await fetch('${envPublic.NEXT_PUBLIC_APP_URL}${apiEndpoints.v1.escrow.create}', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    seller: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    amount: '1.5',
    disputeWindow: 86400,
    metadata: 'Purchase of digital goods'
  })
});

const data = await response.json();
console.log(data);`
        },
        {
          language: 'Python',
          code: `import requests

response = requests.post(
    '${envPublic.NEXT_PUBLIC_APP_URL}${apiEndpoints.v1.escrow.create}',
    headers={
        'Authorization': 'Bearer YOUR_API_KEY',
        'Content-Type': 'application/json'
    },
    json={
        'seller': '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
        'amount': '1.5',
        'disputeWindow': 86400,
        'metadata': 'Purchase of digital goods'
    }
)

data = response.json()
print(data)`
        },
        {
          language: 'cURL',
          code: `curl -X POST ${envPublic.NEXT_PUBLIC_APP_URL}${apiEndpoints.v1.escrow.create} \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "seller": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
    "amount": "1.5",
    "disputeWindow": 86400,
    "metadata": "Purchase of digital goods"
  }'`
        }
      ]
    },
    {
      method: 'GET',
      path: '/api/v1/escrow/{id}',
      description: 'Get details of a specific escrow transaction',
      authentication: true,
      responseExample: {
        data: {
          escrow: {
            id: 'escrow_1234567890',
            buyer: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            seller: '0x5aAeb6053f3E94C9b9A09f33669435E7Ef1BeAed',
            amount: '1.5',
            fee: '0.015',
            status: 'FUNDED',
            createdAt: '2024-01-15T10:30:00Z',
            fundedAt: '2024-01-15T10:45:00Z'
          }
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v1/escrow/{id}/fund',
      description: 'Fund an escrow transaction',
      authentication: true,
      requestBody: {
        transactionHash: '0x123abc456def789...'
      },
      responseExample: {
        data: {
          escrow: {
            id: 'escrow_1234567890',
            status: 'FUNDED',
            fundedAt: '2024-01-15T10:45:00Z'
          },
          message: 'Escrow funded successfully'
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v1/escrow/{id}/confirm',
      description: 'Confirm delivery and release funds',
      authentication: true,
      requestBody: {
        signature: '0xabc...',
        message: 'Delivery confirmed'
      },
      responseExample: {
        data: {
          escrow: {
            id: 'escrow_1234567890',
            status: 'CONFIRMED',
            confirmedAt: '2024-01-16T14:30:00Z'
          },
          message: 'Delivery confirmed and funds released to seller'
        }
      }
    },
    {
      method: 'POST',
      path: '/api/v1/escrow/{id}/dispute',
      description: 'Raise a dispute for an escrow transaction',
      authentication: true,
      requestBody: {
        reason: 'Item not as described',
        evidence: 'https://example.com/evidence.pdf'
      },
      responseExample: {
        data: {
          escrow: {
            id: 'escrow_1234567890',
            status: 'DISPUTED'
          },
          dispute: {
            id: 'dispute_987654321',
            reason: 'Item not as described',
            status: 'PENDING_REVIEW'
          }
        }
      }
    },
    {
      method: 'GET',
      path: '/api/v1/escrow/list',
      description: 'List escrow transactions with filtering',
      authentication: true,
      responseExample: {
        data: {
          escrows: [
            {
              id: 'escrow_1234567890',
              buyer: '0x742...',
              seller: '0x5aA...',
              amount: '1.5',
              status: 'FUNDED'
            }
          ],
          pagination: {
            total: 42,
            limit: 10,
            offset: 0,
            hasMore: true
          }
        }
      }
    }
  ]

  return (
    <div className='min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950'>
      <Header />
      {/* Hero Section */}
      <div className='border-b bg-white/50 backdrop-blur-sm dark:bg-gray-900/50'>
        <div className='container mx-auto px-4 py-16'>
          <div className='mx-auto max-w-4xl text-center'>
            <div className='mb-6 flex justify-center'>
              <div className='flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg'>
                <Terminal className='h-10 w-10' />
              </div>
            </div>
            <h1 className='mb-4 text-4xl font-bold'>Escrow as a Service API</h1>
            <p className='text-muted-foreground mb-8 text-xl'>
              Integrate secure, blockchain-based escrow into your application
              with our simple REST API
            </p>
            <div className='flex justify-center gap-4'>
              <Link href={appRoutes.dashboard.settings.apiKeys}>
                <Button
                  size='lg'
                  className='bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                >
                  <Key className='mr-2 h-4 w-4' />
                  Get API Key
                </Button>
              </Link>
              <Link href={appRoutes.dashboard.base}>
                <Button variant='outline' size='lg'>
                  <Activity className='mr-2 h-4 w-4' />
                  View Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className='container mx-auto px-4 py-12'>
        <div className='mx-auto mb-12 grid max-w-5xl gap-6 md:grid-cols-3'>
          <div className='rounded-lg border bg-white p-6 text-center dark:bg-gray-900'>
            <div className='mb-4 flex justify-center'>
              <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white'>
                <Shield className='h-6 w-6' />
              </div>
            </div>
            <h3 className='mb-2 font-semibold'>Secure & Trustless</h3>
            <p className='text-muted-foreground text-sm'>
              Smart contract-based escrow ensures funds are secure and released
              only when conditions are met
            </p>
          </div>

          <div className='rounded-lg border bg-white p-6 text-center dark:bg-gray-900'>
            <div className='mb-4 flex justify-center'>
              <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 text-white'>
                <Zap className='h-6 w-6' />
              </div>
            </div>
            <h3 className='mb-2 font-semibold'>Fast Integration</h3>
            <p className='text-muted-foreground text-sm'>
              RESTful API with SDKs in multiple languages for quick integration
              into any application
            </p>
          </div>

          <div className='rounded-lg border bg-white p-6 text-center dark:bg-gray-900'>
            <div className='mb-4 flex justify-center'>
              <div className='flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 text-white'>
                <Clock className='h-6 w-6' />
              </div>
            </div>
            <h3 className='mb-2 font-semibold'>Real-time Updates</h3>
            <p className='text-muted-foreground text-sm'>
              Webhook notifications for all escrow events keep your application
              in sync with blockchain state
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className='mx-auto max-w-5xl'>
          <Tabs defaultValue='getting-started' className='space-y-8'>
            <TabsList className='grid w-full grid-cols-5'>
              <TabsTrigger value='getting-started'>Getting Started</TabsTrigger>
              <TabsTrigger value='authentication'>Authentication</TabsTrigger>
              <TabsTrigger value='endpoints'>Endpoints</TabsTrigger>
              <TabsTrigger value='webhooks'>Webhooks</TabsTrigger>
              <TabsTrigger value='errors'>Error Codes</TabsTrigger>
            </TabsList>

            <TabsContent value='getting-started' className='space-y-6'>
              <div className='prose dark:prose-invert max-w-none'>
                <h2 className='mb-4 text-2xl font-bold'>Quick Start Guide</h2>

                <div className='space-y-6'>
                  <div className='rounded-lg border p-6'>
                    <h3 className='mb-3 flex items-center text-lg font-semibold'>
                      <span className='mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'>
                        1
                      </span>
                      Get Your API Key
                    </h3>
                    <p className='text-muted-foreground mb-3'>
                      API keys are available exclusively for Enterprise plan
                      subscribers. Once you have an Enterprise subscription:
                    </p>
                    <ol className='text-muted-foreground list-inside list-decimal space-y-2 text-sm'>
                      <li>Navigate to Dashboard → Settings → API Keys</li>
                      <li>Click "Create API Key"</li>
                      <li>Give your key a descriptive name</li>
                      <li>Copy and securely store your API key</li>
                    </ol>
                  </div>

                  <div className='rounded-lg border p-6'>
                    <h3 className='mb-3 flex items-center text-lg font-semibold'>
                      <span className='mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'>
                        2
                      </span>
                      Test Your API Connection
                    </h3>
                    <p className='text-muted-foreground mb-3'>
                      Verify your API key is working correctly with this simple
                      request:
                    </p>
                    <CodeBlock
                      code={`curl -H "Authorization: Bearer YOUR_API_KEY" \\
  ${envPublic.NEXT_PUBLIC_APP_URL}${apiEndpoints.v1.escrow.list}`}
                      language='bash'
                      onCopy={() => {}}
                    />
                  </div>

                  <div className='rounded-lg border p-6'>
                    <h3 className='mb-3 flex items-center text-lg font-semibold'>
                      <span className='mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400'>
                        3
                      </span>
                      Create Your First Escrow
                    </h3>
                    <p className='text-muted-foreground mb-3'>
                      Example code to create a new escrow transaction:
                    </p>
                    <CodeBlock
                      code={`const escrow = await createEscrow({
  seller: "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0",
  amount: "1.5", // ETH amount
  disputeWindow: 86400, // 24 hours in seconds
  metadata: "Order #12345"
});`}
                      language='javascript'
                      onCopy={() => {}}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='authentication' className='space-y-6'>
              <div className='prose dark:prose-invert max-w-none'>
                <h2 className='mb-4 text-2xl font-bold'>Authentication</h2>

                <Alert className='mb-6'>
                  <Shield className='h-4 w-4' />
                  <AlertDescription>
                    All API requests require Bearer token authentication. Keep
                    your API keys secure and never expose them in client-side
                    code.
                  </AlertDescription>
                </Alert>

                <div className='space-y-6'>
                  <div className='rounded-lg border p-6'>
                    <h3 className='mb-3 text-lg font-semibold'>
                      Header Format
                    </h3>
                    <CodeBlock
                      code={`Authorization: Bearer esk_abc123def456...`}
                      language='http'
                    />
                  </div>

                  <div className='rounded-lg border p-6'>
                    <h3 className='mb-3 text-lg font-semibold'>
                      Security Best Practices
                    </h3>
                    <ul className='space-y-2 text-sm text-gray-600 dark:text-gray-300'>
                      <li className='flex items-start'>
                        <ChevronRight className='mt-0.5 mr-2 h-4 w-4 text-green-600' />
                        Never expose your API key in client-side code
                      </li>
                      <li className='flex items-start'>
                        <ChevronRight className='mt-0.5 mr-2 h-4 w-4 text-green-600' />
                        Use environment variables to store API keys
                      </li>
                      <li className='flex items-start'>
                        <ChevronRight className='mt-0.5 mr-2 h-4 w-4 text-green-600' />
                        Rotate API keys regularly
                      </li>
                      <li className='flex items-start'>
                        <ChevronRight className='mt-0.5 mr-2 h-4 w-4 text-green-600' />
                        Set expiration dates for API keys when possible
                      </li>
                      <li className='flex items-start'>
                        <ChevronRight className='mt-0.5 mr-2 h-4 w-4 text-green-600' />
                        Use different keys for development and production
                      </li>
                    </ul>
                  </div>

                  <div className='rounded-lg border p-6'>
                    <h3 className='mb-3 text-lg font-semibold'>Rate Limits</h3>
                    <div className='space-y-3'>
                      <p className='text-muted-foreground text-sm'>
                        Rate limits are applied per API key based on your
                        subscription tier:
                      </p>
                      <div className='grid gap-3'>
                        <div className='flex items-center justify-between rounded-lg border bg-gray-50 p-3 dark:bg-gray-800'>
                          <span className='font-semibold'>Enterprise Plan</span>
                          <Badge className='bg-blue-600 text-white'>
                            10,000 requests/hour
                          </Badge>
                        </div>
                      </div>
                      <p className='text-muted-foreground text-xs'>
                        Rate limit headers are included in all responses:
                      </p>
                      <CodeBlock
                        code={`X-RateLimit-Limit: 10000
X-RateLimit-Remaining: 9987
X-RateLimit-Reset: 1642435200`}
                        language='http'
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='endpoints' className='space-y-6'>
              <div className='prose dark:prose-invert max-w-none'>
                <h2 className='mb-4 text-2xl font-bold'>API Endpoints</h2>
                <p className='text-muted-foreground mb-6'>
                  Complete reference for all available API endpoints. Click on
                  any endpoint to see detailed documentation and examples.
                </p>

                <div className='space-y-6'>
                  {endpoints.map((endpoint, index) => (
                    <EndpointCard
                      key={index}
                      endpoint={endpoint}
                      onCopy={() => {}}
                    />
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value='webhooks' className='space-y-6'>
              <div className='prose dark:prose-invert max-w-none'>
                <h2 className='mb-4 text-2xl font-bold'>Webhooks</h2>

                <Alert className='mb-6'>
                  <Info className='h-4 w-4' />
                  <AlertDescription>
                    Webhook functionality is coming soon. You'll be able to
                    receive real-time notifications for all escrow events
                    directly to your application.
                  </AlertDescription>
                </Alert>

                <div className='rounded-lg border p-6'>
                  <h3 className='mb-3 text-lg font-semibold'>
                    Planned Webhook Events
                  </h3>
                  <ul className='space-y-2 text-sm text-gray-700 dark:text-gray-300'>
                    <li className='flex items-center'>
                      <CheckCircle2 className='mr-2 h-4 w-4 text-green-600' />
                      <code>escrow.created</code> - New escrow created
                    </li>
                    <li className='flex items-center'>
                      <Activity className='mr-2 h-4 w-4 text-blue-600' />
                      <code>escrow.funded</code> - Escrow funded by buyer
                    </li>
                    <li className='flex items-center'>
                      <CheckCircle className='mr-2 h-4 w-4 text-green-600' />
                      <code>escrow.confirmed</code> - Delivery confirmed
                    </li>
                    <li className='flex items-center'>
                      <AlertTriangle className='mr-2 h-4 w-4 text-orange-600' />
                      <code>escrow.disputed</code> - Dispute raised
                    </li>
                    <li className='flex items-center'>
                      <CheckCircle2 className='mr-2 h-4 w-4 text-green-600' />
                      <code>escrow.completed</code> - Escrow completed
                    </li>
                    <li className='flex items-center'>
                      <Info className='mr-2 h-4 w-4 text-blue-600' />
                      <code>escrow.refunded</code> - Funds refunded to buyer
                    </li>
                  </ul>
                </div>
              </div>
            </TabsContent>

            <TabsContent value='errors' className='space-y-6'>
              <div className='prose dark:prose-invert max-w-none'>
                <h2 className='mb-4 text-2xl font-bold'>Error Codes</h2>

                <div className='mb-6 rounded-lg border p-6'>
                  <h3 className='mb-3 text-lg font-semibold'>
                    Error Response Format
                  </h3>
                  <p className='text-muted-foreground mb-3 text-sm'>
                    All error responses follow a consistent format:
                  </p>
                  <CodeBlock
                    code={JSON.stringify(
                      {
                        error: {
                          message: 'Invalid API key',
                          code: 'UNAUTHORIZED'
                        }
                      },
                      null,
                      2
                    )}
                    language='JSON'
                  />
                </div>

                <div className='overflow-hidden rounded-lg border'>
                  <table className='w-full'>
                    <thead className='bg-muted'>
                      <tr>
                        <th className='p-4 text-left'>HTTP Status</th>
                        <th className='p-4 text-left'>Error Code</th>
                        <th className='p-4 text-left'>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className='border-t'>
                        <td className='p-4'>
                          <Badge variant='outline'>400</Badge>
                        </td>
                        <td className='p-4'>
                          <code className='text-sm'>BAD_REQUEST</code>
                        </td>
                        <td className='text-muted-foreground p-4 text-sm'>
                          Invalid request parameters or missing required fields
                        </td>
                      </tr>
                      <tr className='border-t'>
                        <td className='p-4'>
                          <Badge variant='outline'>401</Badge>
                        </td>
                        <td className='p-4'>
                          <code className='text-sm'>UNAUTHORIZED</code>
                        </td>
                        <td className='text-muted-foreground p-4 text-sm'>
                          Missing or invalid API key
                        </td>
                      </tr>
                      <tr className='border-t'>
                        <td className='p-4'>
                          <Badge variant='outline'>403</Badge>
                        </td>
                        <td className='p-4'>
                          <code className='text-sm'>FORBIDDEN</code>
                        </td>
                        <td className='text-muted-foreground p-4 text-sm'>
                          Access denied - insufficient permissions or
                          subscription tier
                        </td>
                      </tr>
                      <tr className='border-t'>
                        <td className='p-4'>
                          <Badge variant='outline'>404</Badge>
                        </td>
                        <td className='p-4'>
                          <code className='text-sm'>NOT_FOUND</code>
                        </td>
                        <td className='text-muted-foreground p-4 text-sm'>
                          Resource not found - the requested endpoint or
                          resource does not exist
                        </td>
                      </tr>
                      <tr className='border-t'>
                        <td className='p-4'>
                          <Badge variant='outline'>429</Badge>
                        </td>
                        <td className='p-4'>
                          <code className='text-sm'>RATE_LIMITED</code>
                        </td>
                        <td className='text-muted-foreground p-4 text-sm'>
                          Too many requests - rate limit exceeded, please retry
                          after cooldown period
                        </td>
                      </tr>
                      <tr className='border-t'>
                        <td className='p-4'>
                          <Badge variant='outline'>500</Badge>
                        </td>
                        <td className='p-4'>
                          <code className='text-sm'>INTERNAL_ERROR</code>
                        </td>
                        <td className='text-muted-foreground p-4 text-sm'>
                          Internal server error - unexpected error occurred,
                          please try again later
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* CTA Section */}
          <div className='mt-16 rounded-lg border bg-gradient-to-br from-blue-50 to-purple-50 p-8 text-center dark:from-blue-950/20 dark:to-purple-950/20'>
            <h2 className='mb-4 text-2xl font-bold'>Ready to Get Started?</h2>
            <p className='text-muted-foreground mb-6'>
              Join thousands of developers building trustless applications with
              our Escrow API
            </p>
            <div className='flex justify-center gap-4'>
              <Link href={appRoutes.pricing}>
                <Button
                  size='lg'
                  className='bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
                >
                  Get Enterprise Access
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
