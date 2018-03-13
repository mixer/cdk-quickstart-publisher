# miix-quickstart-publisher

This is a helper script to publish quickstarts for miix.

### How to use

1. Set your `AZURE_STORAGE_CONNECTION_STRING` environment variable appropriately. [`direnv`](https://direnv.net/) is super useful for this.
2. Create a `.miix-quickstart` file in your project that exports a list of file rules. Here's an [example](https://github.com/mixer/interactive-launchpad/blob/master/.miix-quickstart).
3. `npm install -g @mcph/miix-quickstart-publisher`
4. Run `miix-quickstart-publisher` to do the thing!

![](./example.png)
