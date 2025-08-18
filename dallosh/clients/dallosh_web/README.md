# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.


What we need to fix in src/app/chat/[id]/page.tsx to send images and files

```html
<DropdownMenuTrigger asChild>
    <Button
    variant="outline"
    size="icon"
    className={`h-12 w-12 rounded-full border-2 border-dashed transition-all ${
        selectedFile 
        ? "border-green-400 bg-green-50 text-green-600 dark:bg-green-950 dark:border-green-600" 
        : "border-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500"
    }`}
    disabled={true}
    >
    <Paperclip className="h-5 w-5" />
    </Button>
</DropdownMenuTrigger>
```

Terms and Conditions
src/app/chat:
```tsx
{/* Terms & Conditions Modal */}
<Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
</Dialog>

```



Important note:
To connect to the AI server: src/app/chat/service.ts

```js
// Connect to the server with session data in URL (EXACT from reference)
await this.pcClient.connect({
connectionUrl: `${serverBaseUrl}/api/offer?${queryParams.toString()}`
});
```
