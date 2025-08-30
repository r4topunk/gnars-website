'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Info } from 'lucide-react'
import { Transaction } from './proposal-wizard'
import { DroposalForm } from './droposal-form'
import { formatEther, parseEther, encodeFunctionData } from 'viem'

interface ActionFormsProps {
  actionType: string
  existingData?: Transaction
  onSubmit: (data: Partial<Transaction>) => void
  onCancel: () => void
}

interface FormData {
  target?: string
  description?: string
  value?: string
  recipient?: string
  amount?: string
  tokenAddress?: string
  contractAddress?: string
  tokenId?: string
  from?: string
  to?: string
  calldata?: string
  abi?: string
  [key: string]: string | undefined
}

interface FormComponentProps {
  data: FormData
  onChange: (updates: Partial<FormData>) => void
}

interface AbiFunction {
  name: string
  type: string
  inputs?: Array<{
    name: string
    type: string
  }>
}

export function ActionForms({ actionType, existingData, onSubmit, onCancel }: ActionFormsProps) {
  const [formData, setFormData] = useState<FormData>({
    target: existingData?.target || '',
    description: existingData?.description || '',
    value: existingData?.value ? formatEther(existingData.value) : '0',
    recipient: existingData?.recipient as string || '',
    amount: existingData?.amount as string || '',
    tokenAddress: existingData?.tokenAddress as string || '',
    contractAddress: existingData?.contractAddress as string || '',
    tokenId: existingData?.tokenId as string || '',
    from: existingData?.from as string || '',
    to: existingData?.to as string || '',
    calldata: existingData?.calldata || '',
    abi: existingData?.abi as string || '',
  })

  const updateFormData = (updates: Partial<FormData>) => {
    setFormData((prev: FormData) => ({ ...prev, ...updates }))
  }

  const handleSubmit = () => {
    let calldata = '0x'
    let value = BigInt(0)
    let target = formData.target

    try {
      if (actionType === 'send-eth') {
        value = parseEther(formData.value || '0')
        // Simple ETH transfer has empty calldata
      } else if (actionType === 'send-tokens') {
        // ERC-20 transfer
        const transferCalldata = encodeFunctionData({
          abi: [
            {
              name: 'transfer',
              type: 'function',
              inputs: [
                { name: 'to', type: 'address' },
                { name: 'amount', type: 'uint256' }
              ],
            }
          ],
          functionName: 'transfer',
          args: [formData.recipient, parseEther(formData.amount || '0')],
        })
        calldata = transferCalldata
        target = formData.tokenAddress
      } else if (actionType === 'send-nfts') {
        // ERC-721 transferFrom
        const transferFromCalldata = encodeFunctionData({
          abi: [
            {
              name: 'transferFrom',
              type: 'function',
              inputs: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'tokenId', type: 'uint256' }
              ],
            }
          ],
          functionName: 'transferFrom',
          args: [formData.from || '0x', formData.to, BigInt(formData.tokenId || '0')],
        })
        calldata = transferFromCalldata
        target = formData.contractAddress
      } else if (actionType === 'custom') {
        // Use provided calldata
        calldata = formData.calldata || '0x'
        if (formData.value) {
          value = parseEther(formData.value)
        }
      }
      // droposal handled separately
    } catch (error) {
      console.error('Error encoding transaction:', error)
      return
    }

    onSubmit({
      target,
      calldata,
      value,
      description: formData.description,
      type: actionType as Transaction['type'],
      id: Math.random().toString(36).substr(2, 9),
    })
  }

  const renderForm = () => {
    switch (actionType) {
      case 'send-eth':
        return <SendEthForm data={formData} onChange={updateFormData} />
      case 'send-tokens':
        return <SendTokensForm data={formData} onChange={updateFormData} />
      case 'send-nfts':
        return <SendNFTsForm data={formData} onChange={updateFormData} />
      case 'droposal':
        return <DroposalForm data={formData} onChange={updateFormData} />
      case 'custom':
        return <CustomTransactionForm data={formData} onChange={updateFormData} />
      default:
        return <div>Unknown action type</div>
    }
  }

  const getTitle = () => {
    const titles = {
      'send-eth': 'Send ETH',
      'send-tokens': 'Send Tokens', 
      'send-nfts': 'Send NFTs',
      'droposal': 'Create Droposal',
      'custom': 'Custom Transaction',
    }
    return titles[actionType as keyof typeof titles] || 'Transaction'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-4">
          <Button size="sm" variant="outline" onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>{getTitle()}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {existingData ? 'Edit transaction details' : 'Configure transaction details'}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderForm()}
        
        <Separator />
        
        <div className="flex justify-end space-x-3">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {existingData ? 'Update Transaction' : 'Add Transaction'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function SendEthForm({ data, onChange }: FormComponentProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="recipient">Recipient Address *</Label>
        <Input
          id="recipient"
          placeholder="0x... or ENS name"
          value={data.target || ''}
          onChange={(e) => onChange({ target: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="amount">Amount (ETH) *</Label>
        <Input
          id="amount"
          type="number"
          step="0.001"
          placeholder="0.0"
          value={data.value || ''}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the purpose of this payment..."
          value={data.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
    </div>
  )
}

function SendTokensForm({ data, onChange }: FormComponentProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="tokenAddress">Token Contract Address *</Label>
        <Input
          id="tokenAddress"
          placeholder="0x..."
          value={data.tokenAddress || ''}
          onChange={(e) => onChange({ tokenAddress: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="recipient">Recipient Address *</Label>
        <Input
          id="recipient"
          placeholder="0x... or ENS name"
          value={data.recipient || ''}
          onChange={(e) => onChange({ recipient: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="amount">Amount *</Label>
        <Input
          id="amount"
          type="number"
          step="0.001"
          placeholder="0.0"
          value={data.amount || ''}
          onChange={(e) => onChange({ amount: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the purpose of this token transfer..."
          value={data.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
    </div>
  )
}

function SendNFTsForm({ data, onChange }: FormComponentProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="contractAddress">NFT Contract Address *</Label>
        <Input
          id="contractAddress"
          placeholder="0x..."
          value={data.contractAddress || ''}
          onChange={(e) => onChange({ contractAddress: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="tokenId">Token ID *</Label>
        <Input
          id="tokenId"
          placeholder="1"
          value={data.tokenId || ''}
          onChange={(e) => onChange({ tokenId: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="from">From Address *</Label>
        <Input
          id="from"
          placeholder="0x... (typically treasury address)"
          value={data.from || ''}
          onChange={(e) => onChange({ from: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="to">To Address *</Label>
        <Input
          id="to"
          placeholder="0x... or ENS name"
          value={data.to || ''}
          onChange={(e) => onChange({ to: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe the purpose of this NFT transfer..."
          value={data.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
    </div>
  )
}

function CustomTransactionForm({ data, onChange }: FormComponentProps) {
  const [selectedFunction, setSelectedFunction] = useState('')
  const [parsedAbi, setParsedAbi] = useState<AbiFunction[]>([])

  const handleAbiChange = (abiString: string) => {
    onChange({ abi: abiString })
    try {
      const abi = JSON.parse(abiString)
      setParsedAbi(abi.filter((item: AbiFunction) => item.type === 'function'))
    } catch {
      setParsedAbi([])
    }
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Custom transactions require technical knowledge. Make sure you understand the contract interaction.
        </AlertDescription>
      </Alert>
      
      <div>
        <Label htmlFor="target">Contract Address *</Label>
        <Input
          id="target"
          placeholder="0x..."
          value={data.target || ''}
          onChange={(e) => onChange({ target: e.target.value })}
        />
      </div>
      
      <div>
        <Label htmlFor="value">Value (ETH)</Label>
        <Input
          id="value"
          type="number"
          step="0.001"
          placeholder="0.0"
          value={data.value || '0'}
          onChange={(e) => onChange({ value: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="abi">Contract ABI *</Label>
        <Textarea
          id="abi"
          placeholder="[{...}] - Paste the contract ABI JSON"
          value={data.abi || ''}
          onChange={(e) => handleAbiChange(e.target.value)}
          rows={4}
        />
      </div>

      {parsedAbi.length > 0 && (
        <div>
          <Label htmlFor="function">Function</Label>
          <Select value={selectedFunction} onValueChange={setSelectedFunction}>
            <SelectTrigger>
              <SelectValue placeholder="Select a function" />
            </SelectTrigger>
            <SelectContent>
              {parsedAbi.map((func, i) => (
                <SelectItem key={i} value={func.name}>
                  {func.name}({func.inputs?.map((input) => input.type).join(', ')})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div>
        <Label htmlFor="calldata">Calldata</Label>
        <Textarea
          id="calldata"
          placeholder="0x... - Transaction calldata"
          value={data.calldata || '0x'}
          onChange={(e) => onChange({ calldata: e.target.value })}
          rows={2}
        />
      </div>

      <div>
        <Label htmlFor="description">Description *</Label>
        <Textarea
          id="description"
          placeholder="Clearly describe what this transaction does..."
          value={data.description || ''}
          onChange={(e) => onChange({ description: e.target.value })}
        />
      </div>
    </div>
  )
}