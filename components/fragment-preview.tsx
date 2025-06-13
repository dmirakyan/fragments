'use client'

import { FragmentInterpreter } from './fragment-interpreter'
import { FragmentWeb } from './fragment-web'
import { ExecutionResult } from '@/lib/types'
import { FragmentSchema } from '@/lib/schema'
import { DeepPartial } from 'ai'

interface FragmentPreviewProps {
  result: ExecutionResult
  fragment?: DeepPartial<FragmentSchema>
  teamID?: string
  accessToken?: string
  onRebuild?: (newResult: ExecutionResult) => void
}

export function FragmentPreview({ result, fragment, teamID, accessToken, onRebuild }: FragmentPreviewProps) {
  if (result.template === 'code-interpreter-v1') {
    return <FragmentInterpreter result={result} />
  }

  return <FragmentWeb result={result} fragment={fragment} teamID={teamID} accessToken={accessToken} onRebuild={onRebuild} />
}
