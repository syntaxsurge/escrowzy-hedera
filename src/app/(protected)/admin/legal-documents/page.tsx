'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import '@uiw/react-md-editor/markdown-editor.css'
import '@uiw/react-markdown-preview/markdown.css'
import '@/styles/pages/editor-styles.css'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiEndpoints } from '@/config/api-endpoints'
import { useToast } from '@/hooks/use-toast'
import { formatDate } from '@/lib'
import { api } from '@/lib/api/http-client'
import { nonEmptyString } from '@/lib/schemas/common'
import { handleFormSuccess } from '@/lib/utils/form'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false })

const documentSchema = z.object({
  title: nonEmptyString.describe('Title is required'),
  content: nonEmptyString.describe('Content is required')
})

type DocumentFormData = z.infer<typeof documentSchema>

interface LegalDocument {
  type: string
  title: string
  content: string
  lastUpdatedAt: string
}

export default function LegalDocumentsPage() {
  const [documents, setDocuments] = useState<LegalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [termsPreviewMode, setTermsPreviewMode] = useState<
    'edit' | 'preview' | 'live'
  >('edit')
  const [privacyPreviewMode, setPrivacyPreviewMode] = useState<
    'edit' | 'preview' | 'live'
  >('edit')
  const { toast } = useToast()
  const { theme } = useTheme()

  const termsForm = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: '',
      content: ''
    }
  })

  const privacyForm = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      title: '',
      content: ''
    }
  })

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const { data } = await api.get(apiEndpoints.admin.legalDocuments.base)
      setDocuments(data.documents)

      const termsDoc = data.documents.find(
        (doc: LegalDocument) => doc.type === 'terms'
      )
      const privacyDoc = data.documents.find(
        (doc: LegalDocument) => doc.type === 'privacy'
      )

      if (termsDoc) {
        termsForm.reset({
          title: termsDoc.title,
          content: termsDoc.content
        })
      }

      if (privacyDoc) {
        privacyForm.reset({
          title: privacyDoc.title,
          content: privacyDoc.content
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (
    type: 'terms' | 'privacy',
    data: DocumentFormData
  ) => {
    setSaving(true)
    try {
      const { success } = await api.put(
        apiEndpoints.admin.legalDocuments.byType(type),
        data
      )

      if (!success) throw new Error('Failed to update document')

      handleFormSuccess(
        toast,
        `${type === 'terms' ? 'Terms of Service' : 'Privacy Policy'} updated successfully`
      )

      await fetchDocuments()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className='flex min-h-[400px] items-center justify-center'>
        <Loader2 className='h-8 w-8 animate-spin' />
      </div>
    )
  }

  const termsDoc = documents.find(doc => doc.type === 'terms')
  const privacyDoc = documents.find(doc => doc.type === 'privacy')

  return (
    <div className='space-y-6'>
      <div>
        <h2 className='text-3xl font-bold tracking-tight'>Legal Documents</h2>
        <p className='text-muted-foreground'>
          Manage your Terms of Service and Privacy Policy
        </p>
      </div>

      <Tabs defaultValue='terms' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='terms'>Terms of Service</TabsTrigger>
          <TabsTrigger value='privacy'>Privacy Policy</TabsTrigger>
        </TabsList>

        <TabsContent value='terms' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Terms of Service</CardTitle>
              {termsDoc && (
                <p className='text-muted-foreground text-sm'>
                  Last updated: {formatDate(termsDoc.lastUpdatedAt)}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <Form {...termsForm}>
                <form
                  onSubmit={termsForm.handleSubmit(data =>
                    handleSubmit('terms', data)
                  )}
                  className='space-y-4'
                >
                  <FormField
                    control={termsForm.control}
                    name='title'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder='Terms of Service' />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={termsForm.control}
                    name='content'
                    render={({ field }) => (
                      <FormItem>
                        <div className='mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                          <FormLabel>Content</FormLabel>
                          <div className='flex flex-wrap gap-2'>
                            <Button
                              type='button'
                              variant={
                                termsPreviewMode === 'edit'
                                  ? 'default'
                                  : 'outline'
                              }
                              size='sm'
                              onClick={() => setTermsPreviewMode('edit')}
                            >
                              Edit
                            </Button>
                            <Button
                              type='button'
                              variant={
                                termsPreviewMode === 'live'
                                  ? 'default'
                                  : 'outline'
                              }
                              size='sm'
                              onClick={() => setTermsPreviewMode('live')}
                            >
                              Split View
                            </Button>
                            <Button
                              type='button'
                              variant={
                                termsPreviewMode === 'preview'
                                  ? 'default'
                                  : 'outline'
                              }
                              size='sm'
                              onClick={() => setTermsPreviewMode('preview')}
                            >
                              Preview
                            </Button>
                          </div>
                        </div>
                        <FormControl>
                          <div
                            data-color-mode={
                              theme === 'dark' ? 'dark' : 'light'
                            }
                          >
                            <MDEditor
                              value={field.value}
                              onChange={value => field.onChange(value || '')}
                              preview={termsPreviewMode}
                              height={500}
                              textareaProps={{
                                placeholder:
                                  'Enter your terms of service content here...'
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type='submit' disabled={saving}>
                    {saving ? 'Saving...' : 'Save Terms'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value='privacy' className='space-y-4'>
          <Card>
            <CardHeader>
              <CardTitle>Privacy Policy</CardTitle>
              {privacyDoc && (
                <p className='text-muted-foreground text-sm'>
                  Last updated: {formatDate(privacyDoc.lastUpdatedAt)}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <Form {...privacyForm}>
                <form
                  onSubmit={privacyForm.handleSubmit(data =>
                    handleSubmit('privacy', data)
                  )}
                  className='space-y-4'
                >
                  <FormField
                    control={privacyForm.control}
                    name='title'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder='Privacy Policy' />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={privacyForm.control}
                    name='content'
                    render={({ field }) => (
                      <FormItem>
                        <div className='mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                          <FormLabel>Content</FormLabel>
                          <div className='flex flex-wrap gap-2'>
                            <Button
                              type='button'
                              variant={
                                privacyPreviewMode === 'edit'
                                  ? 'default'
                                  : 'outline'
                              }
                              size='sm'
                              onClick={() => setPrivacyPreviewMode('edit')}
                            >
                              Edit
                            </Button>
                            <Button
                              type='button'
                              variant={
                                privacyPreviewMode === 'live'
                                  ? 'default'
                                  : 'outline'
                              }
                              size='sm'
                              onClick={() => setPrivacyPreviewMode('live')}
                            >
                              Split View
                            </Button>
                            <Button
                              type='button'
                              variant={
                                privacyPreviewMode === 'preview'
                                  ? 'default'
                                  : 'outline'
                              }
                              size='sm'
                              onClick={() => setPrivacyPreviewMode('preview')}
                            >
                              Preview
                            </Button>
                          </div>
                        </div>
                        <FormControl>
                          <div
                            data-color-mode={
                              theme === 'dark' ? 'dark' : 'light'
                            }
                          >
                            <MDEditor
                              value={field.value}
                              onChange={value => field.onChange(value || '')}
                              preview={privacyPreviewMode}
                              height={500}
                              textareaProps={{
                                placeholder:
                                  'Enter your privacy policy content here...'
                              }}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button type='submit' disabled={saving}>
                    {saving ? 'Saving...' : 'Save Privacy Policy'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
