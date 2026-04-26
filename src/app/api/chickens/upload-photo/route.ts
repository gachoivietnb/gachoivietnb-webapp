import { createClient } from '@/lib/supabase/server'
import { getDriveClient } from '@/lib/google-drive/client'
import { NextResponse } from 'next/server'
import { Readable } from 'stream'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID) {
    return NextResponse.json(
      { error: 'Google Drive chưa được cấu hình (thiếu GOOGLE_DRIVE_PARENT_FOLDER_ID). Vào Cài đặt → Tích hợp để setup.' },
      { status: 501 }
    )
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const chickenId = formData.get('chicken_id') as string | null
  const isMain = formData.get('is_main') === 'true'

  if (!file || !chickenId) {
    return NextResponse.json({ error: 'Missing file or chicken_id' }, { status: 400 })
  }

  const { data: chicken } = await supabase
    .from('chickens')
    .select('chicken_code, drive_folder_id, main_photo_url')
    .eq('id', chickenId)
    .single()

  if (!chicken) {
    return NextResponse.json({ error: 'Chicken not found' }, { status: 404 })
  }

  const chickenRow = chicken as {
    chicken_code: string
    drive_folder_id: string | null
    main_photo_url: string | null
  }

  const drive = getDriveClient()

  let folderId = chickenRow.drive_folder_id
  if (!folderId) {
    const folderRes = await drive.files.create({
      requestBody: {
        name: chickenRow.chicken_code,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID!],
      },
      fields: 'id',
    })
    folderId = folderRes.data.id!

    await drive.permissions.create({
      fileId: folderId,
      requestBody: { role: 'reader', type: 'anyone' },
    })

    await supabase
      .from('chickens')
      .update({ drive_folder_id: folderId } as never)
      .eq('id', chickenId)
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const stream = Readable.from(buffer)

  const fileRes = await drive.files.create({
    requestBody: {
      name: `${Date.now()}_${file.name}`,
      parents: [folderId],
      mimeType: file.type,
    },
    media: {
      mimeType: file.type,
      body: stream,
    },
    fields: 'id, webViewLink, webContentLink, thumbnailLink',
  })

  await drive.permissions.create({
    fileId: fileRes.data.id!,
    requestBody: { role: 'reader', type: 'anyone' },
  })

  const directUrl = `https://drive.google.com/uc?export=view&id=${fileRes.data.id}`
  const thumbnailUrl = `https://drive.google.com/thumbnail?id=${fileRes.data.id}&sz=w400`

  await supabase.from('chicken_media').insert({
    chicken_id: chickenId,
    media_type: file.type.startsWith('video') ? 'video' : 'anh',
    drive_file_id: fileRes.data.id!,
    drive_url: directUrl,
    thumbnail_url: thumbnailUrl,
    is_main: isMain,
    uploaded_by: user.id,
  } as never)

  if (isMain) {
    await supabase
      .from('chickens')
      .update({ main_photo_url: directUrl } as never)
      .eq('id', chickenId)
  }

  return NextResponse.json({
    data: {
      drive_file_id: fileRes.data.id,
      drive_url: directUrl,
      thumbnail_url: thumbnailUrl,
    },
  })
}
