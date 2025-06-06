import { FragmentSchema } from '@/lib/schema'
import { Sandbox } from '@e2b/code-interpreter'

export const maxDuration = 60

export async function POST(req: Request) {
  const {
    sbxId,
    fragment,
    teamID,
    accessToken,
  }: {
    sbxId: string
    fragment: FragmentSchema
    teamID?: string
    accessToken?: string
  } = await req.json()

  if (!sbxId || !fragment) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400 }
    )
  }

  try {
    // Connect to existing sandbox using reconnect
    const sbx = await Sandbox.reconnect(sbxId, {
      ...(teamID && accessToken
        ? {
            headers: {
              'X-Supabase-Team': teamID,
              'X-Supabase-Token': accessToken,
            },
          }
        : {}),
    })

    // Install additional packages if needed
    if (fragment.has_additional_dependencies) {
      await sbx.commands.run(fragment.install_dependencies_command)
      console.log(
        `Installed dependencies: ${fragment.additional_dependencies.join(', ')} in sandbox ${sbx.sandboxId}`,
      )
    }

    // Update files with latest code
    if (fragment.code && Array.isArray(fragment.code)) {
      for (const file of fragment.code) {
        await sbx.files.write(file.file_path, file.file_content)
        console.log(`Updated file ${file.file_path} in ${sbx.sandboxId}`)
      }
    } else {
      await sbx.files.write(fragment.file_path, fragment.code)
      console.log(`Updated file ${fragment.file_path} in ${sbx.sandboxId}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        sbxId: sbx.sandboxId,
        url: `https://${sbx.getHost(fragment.port || 80)}`,
      }),
    )
  } catch (error) {
    console.error('Failed to update sandbox:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update sandbox',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500 }
    )
  }
} 