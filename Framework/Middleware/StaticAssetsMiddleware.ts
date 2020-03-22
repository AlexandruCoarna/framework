import { Inject, Injectable } from '../../Container';
import { MiddlewareInterface, RequestHandler, RouteNotFoundError } from '../../Router';
import { AppConfig } from '../AppConfig';
import { Storage } from '../../Storage';
import { Http, Request, Response } from '../../Http';

@Injectable()
export class StaticAssetsMiddleware implements MiddlewareInterface {

    @Inject()
    appConfig: AppConfig;

    @Inject()
    storage: Storage;

    mimeTypes: {[key: string]: string} = {
        'txt': 'text/plain',
        'js': 'text/javascript',
        'html': 'text/html',
        'css': 'text/css',
        'jpg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
    };

    async handle(request: Request, next: RequestHandler) {
        if (request.headers.accept?.includes('application/json')) {
            return next(request);
        }
        try {
            return await next(request);
        } catch (error) {
            if (error instanceof RouteNotFoundError) {
                return this.loadStaticAsset(request);
            }
            throw error;
        }
    }

    async loadStaticAsset(request: Request): Promise<Response> {
        const assetsDirectories = this.appConfig.staticAssets;
        for (const path in assetsDirectories) {
            let directories = assetsDirectories[path];
            if (typeof directories === 'string') {
                directories = [directories];
            }
            for (const directory of directories) {
                let realPath = directory;
                let extension = this.getExtension(request.uri);
                if (extension) {
                    realPath += request.uri;
                } else {
                    realPath += '/index.html';
                    extension = 'html';
                }

                const file = await this.storage.read(realPath);
                const contentType = this.mimeTypes[extension || 'application/octet-stream'] || this.mimeTypes.txt;
                return new Response(Http.Status.OK, file, {'Content-type': contentType});
            }
        }

        throw new RouteNotFoundError(request.uri);
    }

    getExtension(string: string): string | undefined {
        const parts = string.split('.');
        if (parts.length === 1) {
            return undefined;
        }
        return parts.pop();
    }
}

