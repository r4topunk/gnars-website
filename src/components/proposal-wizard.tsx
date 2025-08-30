'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TransactionBuilder } from '@/components/transaction-builder'
import { ProposalDetailsForm } from '@/components/proposal-details-form'
import { ProposalPreview } from '@/components/proposal-preview'

export interface ProposalFormData {
  title: string
  description: string
  bannerImage?: string
  transactions: Transaction[]
}

export interface Transaction {
  id: string
  type: 'send-eth' | 'send-tokens' | 'send-nfts' | 'droposal' | 'custom'
  target: string
  value?: bigint
  calldata: string
  description: string
  [key: string]: string | bigint | undefined // For additional transaction-specific data
}

export function ProposalWizard() {
  const [currentTab, setCurrentTab] = useState('details')
  const [formData, setFormData] = useState<ProposalFormData>({
    title: '',
    description: '',
    transactions: [],
  })

  const updateFormData = (updates: Partial<ProposalFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const addTransaction = (transaction: Transaction) => {
    setFormData(prev => ({
      ...prev,
      transactions: [...prev.transactions, transaction],
    }))
  }

  const updateTransaction = (id: string, updates: Partial<Transaction>) => {
    setFormData(prev => ({
      ...prev,
      transactions: prev.transactions.map(tx =>
        tx.id === id ? { ...tx, ...updates } : tx
      ),
    }))
  }

  const removeTransaction = (id: string) => {
    setFormData(prev => ({
      ...prev,
      transactions: prev.transactions.filter(tx => tx.id !== id),
    }))
  }

  const canProceedToTransactions = formData.title.trim() !== ''
  const canProceedToPreview = canProceedToTransactions && formData.transactions.length > 0

  return (
    <div className="max-w-4xl mx-auto">
      <Tabs value={currentTab} onValueChange={setCurrentTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details" className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
              1
            </span>
            Details
          </TabsTrigger>
          <TabsTrigger 
            value="transactions" 
            disabled={!canProceedToTransactions}
            className="flex items-center gap-2"
          >
            <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
              canProceedToTransactions 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              2
            </span>
            Transactions
          </TabsTrigger>
          <TabsTrigger 
            value="preview" 
            disabled={!canProceedToPreview}
            className="flex items-center gap-2"
          >
            <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${
              canProceedToPreview 
                ? 'bg-primary text-primary-foreground' 
                : 'bg-muted text-muted-foreground'
            }`}>
              3
            </span>
            Preview
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <ProposalDetailsForm
                  data={formData}
                  onChange={updateFormData}
                />
                <div className="flex justify-end mt-6">
                  <Button
                    onClick={() => setCurrentTab('transactions')}
                    disabled={!canProceedToTransactions}
                  >
                    Next: Add Transactions
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <TransactionBuilder
                  transactions={formData.transactions}
                  onAddTransaction={addTransaction}
                  onUpdateTransaction={updateTransaction}
                  onRemoveTransaction={removeTransaction}
                />
                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentTab('details')}
                  >
                    Back: Edit Details
                  </Button>
                  <Button
                    onClick={() => setCurrentTab('preview')}
                    disabled={!canProceedToPreview}
                  >
                    Next: Preview & Submit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <ProposalPreview data={formData} />
                <div className="flex justify-between mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentTab('transactions')}
                  >
                    Back: Edit Transactions
                  </Button>
                  {/* Submit button will be in ProposalPreview component */}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}