/**
 * openai-mail worker
 * 
 * 功能:
 * - GET "/" -> 返回 "ciallo~"
 * - GET "/{password}/ciallo" -> 返回最新郵件的 HTML 內容
 * - 郵件接收 (由 Cloudflare Email Routing 觸發)
 */

import PostalMime from 'postal-mime';

export interface Env {
	DB: D1Database;
	'JWT_token-password': string;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);
		const path = url.pathname;
		const password = env['JWT_token-password'];

		// GET "/" -> 返回 "ciallo~"
		if (request.method === 'GET' && path === '/') {
			return new Response('ciallo~', { 
				headers: { 'Content-Type': 'text/plain; charset=utf-8' }
			});
		}

		// GET "/{password}/ciallo" -> 返回最新郵件的 HTML
		const cialloMatch = path.match(/^\/([^/]+)\/ciallo$/);
		if (request.method === 'GET' && cialloMatch) {
			const inputPassword = cialloMatch[1];
			
			// 驗證密碼
			if (inputPassword !== password) {
				return new Response('Forbidden', { 
					status: 403,
					headers: { 'Content-Type': 'text/plain; charset=utf-8' }
				});
			}

			// 獲取最新郵件
			const result = await env.DB.prepare(
				'SELECT html_content FROM emails ORDER BY received_at DESC LIMIT 1'
			).first<{ html_content: string }>();

			if (!result || !result.html_content) {
				return new Response('No emails found', { 
					status: 404,
					headers: { 'Content-Type': 'text/plain; charset=utf-8' }
				});
			}

			// 返回郵件的 HTML 內容
			return new Response(result.html_content, {
				headers: { 
					'Content-Type': 'text/html; charset=utf-8',
					'Cache-Control': 'no-cache'
				}
			});
		}

		// 默認返回 404
		return new Response('Not Found', { 
			status: 404,
			headers: { 'Content-Type': 'text/plain; charset=utf-8' }
		});
	},

	// 郵件接收處理 (由 Cloudflare Email Routing 觸發)
	async email(message: ForwardableEmailMessage, env: Env, ctx: ExecutionContext): Promise<void> {
		// 基本資訊
		const from = message.from;
		const to = message.to;
		const subject = message.headers.get('subject') || '';
		
		// 解析郵件內容
		let htmlContent = '';
		let textContent = '';

		try {
			// 讀取原始郵件內容
			const rawText = await new Response(message.raw).text();
			
			// 使用內建的 PostalMime 解析
			const parsed = await PostalMime.parse(rawText);
			
			htmlContent = parsed.html || '';
			textContent = parsed.text || '';
		} catch (e) {
			console.error('Error parsing email:', e);
			// 如果解析失敗，嘗試直接使用原始內容
			try {
				const rawText = await new Response(message.raw).text();
				textContent = rawText;
			} catch (e2) {
				console.error('Error getting raw email:', e2);
			}
		}

		// 將 headers 轉為物件
		const headersObj: Record<string, string> = {};
		message.headers.forEach((value: string, key: string) => {
			headersObj[key] = value;
		});

		// 存儲郵件到 D1
		await env.DB.prepare(
			`INSERT INTO emails (from_address, to_address, subject, text_content, html_content, headers)
			 VALUES (?, ?, ?, ?, ?, ?)`
		).bind(
			from,
			to,
			subject,
			textContent,
			htmlContent,
			JSON.stringify(headersObj)
		).run();
	},
} satisfies ExportedHandler<Env, unknown>;
