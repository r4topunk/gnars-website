'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, Eye } from 'lucide-react'
import { ProposalFormData } from './proposal-wizard'

interface ProposalDetailsFormProps {
  data: ProposalFormData
  onChange: (updates: Partial<ProposalFormData>) => void
}

export function ProposalDetailsForm({ data, onChange }: ProposalDetailsFormProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [showMarkdownPreview, setShowMarkdownPreview] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (file: File) => {
    // Create preview
    const previewUrl = URL.createObjectURL(file)
    setImagePreview(previewUrl)

    // In a real implementation, you would upload to IPFS here
    // For now, we'll store the preview URL
    // TODO: Implement IPFS upload
    const ipfsUrl = `ipfs://${file.name}` // Mock IPFS URL
    onChange({ bannerImage: ipfsUrl })
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file)
    }
  }

  const removeImage = () => {
    setImagePreview(null)
    onChange({ bannerImage: undefined })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const renderMarkdownPreview = (markdown: string) => {
    // Simple markdown preview - in production, use a proper markdown parser
    return markdown
      .split('\n\n')
      .map((paragraph, i) => (
        <p key={i} className="mb-4 last:mb-0">
          {paragraph
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
          }
        </p>
      ))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Proposal Details</h2>
        <p className="text-muted-foreground">
          Provide the basic information for your proposal
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Proposal Title *</Label>
          <Input
            id="title"
            placeholder="Enter proposal title..."
            value={data.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Keep it concise and descriptive
          </p>
        </div>

        <div>
          <Label htmlFor="banner">Banner Image</Label>
          <div className="mt-2">
            {imagePreview ? (
              <div className="relative">
                <Image
                  src={imagePreview}
                  alt="Banner preview"
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover rounded-lg border"
                />
                <Button
                  size="sm"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer hover:border-muted-foreground/50 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Click to upload banner image
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG up to 10MB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="description">Description *</Label>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowMarkdownPreview(!showMarkdownPreview)}
            >
              <Eye className="h-4 w-4 mr-1" />
              {showMarkdownPreview ? 'Edit' : 'Preview'}
            </Button>
          </div>
          
          {showMarkdownPreview ? (
            <Card>
              <CardContent className="p-4 min-h-[200px]">
                {data.description ? (
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: renderMarkdownPreview(data.description).join('')
                    }}
                  />
                ) : (
                  <p className="text-muted-foreground italic">No description yet</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Textarea
              id="description"
              placeholder="Describe your proposal in detail... 

You can use **markdown** formatting:
- **Bold text**
- *Italic text*
- `Code snippets`

Explain the problem, solution, and expected outcomes."
              value={data.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={8}
              className="resize-none"
            />
          )}
          
          <p className="text-xs text-muted-foreground mt-1">
            Markdown formatting supported. Be thorough and clear about your proposal&apos;s purpose and impact.
          </p>
        </div>
      </div>
    </div>
  )
}