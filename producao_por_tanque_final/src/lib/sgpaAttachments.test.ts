import { describe, expect, it } from 'vitest'
import {
  getAppAssetPath,
  getSgpaAttachmentExtension,
  SGPA_ATTACHMENT_MAX_SIZE_BYTES,
  validateSgpaAttachment,
} from './sgpaAttachments'

const attachment = (
  name: string,
  type: string,
  size = 1024,
): Pick<File, 'name' | 'size' | 'type'> => ({ name, type, size })

describe('validateSgpaAttachment', () => {
  it.each([
    ['evidencia.jpg', 'image/jpeg'],
    ['evidencia.jpeg', 'image/jpeg'],
    ['evidencia.png', 'image/png'],
    ['evidencia.webp', 'image/webp'],
    ['relatorio.pdf', 'application/pdf'],
  ])('accepts %s with matching MIME type', (name, type) => {
    expect(validateSgpaAttachment(attachment(name, type))).toBeNull()
  })

  it('rejects executable files', () => {
    expect(
      validateSgpaAttachment(
        attachment('evidencia.exe', 'application/x-msdownload'),
      ),
    ).toContain('Formato não permitido')
  })

  it('rejects a permitted extension with a mismatched MIME type', () => {
    expect(
      validateSgpaAttachment(attachment('evidencia.png', 'text/plain')),
    ).toContain('Formato não permitido')
  })

  it('rejects files larger than 5 MB', () => {
    expect(
      validateSgpaAttachment(
        attachment(
          'evidencia.png',
          'image/png',
          SGPA_ATTACHMENT_MAX_SIZE_BYTES + 1,
        ),
      ),
    ).toContain('5 MB')
  })

  it('returns the validated lower-case extension', () => {
    expect(
      getSgpaAttachmentExtension(attachment('EVIDENCIA.PNG', 'image/png')),
    ).toBe('png')
  })
})

describe('getAppAssetPath', () => {
  it('extracts and decodes an app-assets public path', () => {
    expect(
      getAppAssetPath(
        'https://example.supabase.co/storage/v1/object/public/app-assets/sgpa/teste%20final.png',
      ),
    ).toBe('sgpa/teste final.png')
  })

  it('rejects URLs outside the app-assets public endpoint', () => {
    expect(getAppAssetPath('https://example.com/evidencia.png')).toBeNull()
    expect(getAppAssetPath('not-a-url')).toBeNull()
  })
})
