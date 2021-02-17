const path = require("path");

module.exports = {
  overrideWebpackConfig: ({
    webpackConfig,
    pluginOptions: { orgName, projectName, entry, orgPackagesAsExternal },
    context: { env },
  }) => {
    if (typeof orgName !== "string") {
      throw Error(
        `craco-plugin-single-spa-application requires an orgName string`
      );
    }

    if (typeof projectName !== "string") {
      throw Error(
        `craco-plugin-single-spa-application requires an opts.projectName string`
      );
    }

    webpackConfig.entry = path.resolve(entry || "src/index.js");
    webpackConfig.output.filename = `${orgName}-${projectName}.js`;
    webpackConfig.output.libraryTarget = "system";
    webpackConfig.output.devtoolNamespace = projectName;
    webpackConfig.output.publicPath = "";

    delete webpackConfig.optimization;

    const defaultExternals = [
      "single-spa",
      "single-spa-react",
      "react",
      "react-dom",
    ];
    webpackConfig.externals =
      orgPackagesAsExternal !== false
        ? [...defaultExternals, new RegExp(`^@${orgName}/`)]
        : defaultExternals;

    removeUrlLoaderLimits(webpackConfig);
    disableCSSExtraction(webpackConfig);
    disableSVGExtraction(webpackConfig);

    return webpackConfig;
  },

  overrideCracoConfig: ({ cracoConfig, pluginOptions }) => {
    if (!cracoConfig.webpack) cracoConfig.webpack = {};
    if (!cracoConfig.webpack.plugins) cracoConfig.webpack.plugins = {};
    if (!cracoConfig.webpack.plugins.remove)
      cracoConfig.webpack.plugins.remove = [];

    cracoConfig.webpack.plugins.remove.push("HtmlWebpackPlugin");
    cracoConfig.webpack.plugins.remove.push("MiniCssExtractPlugin");

    cracoConfig.devServer = cracoConfig.devServer || {};
    cracoConfig.devServer.historyApiFallback = true;
    cracoConfig.devServer.firewall = false;
    cracoConfig.devServer.compress = true;
    cracoConfig.devServer.headers = {
      ...cracoConfig.devServer.headers,
      "Access-Control-Allow-Origin": "*",
    };

    return cracoConfig;
  },
};

const removeUrlLoaderLimits = (webpackConfig) => {
  webpackConfig.module.rules[1].oneOf.forEach((rule) => {
    if (rule.use) {
      rule.use.forEach((x) => {
        if (x.options && x.options.limit) delete x.options.limit;
      });
    }

    if (rule.options && rule.options.limit) delete rule.options.limit;
  });
};

const disableCSSExtraction = (webpackConfig) => {
  webpackConfig.module.rules[1].oneOf.forEach((x) => {
    if (!x.use) return;
    x.use.forEach((use) => {
      if (!use.loader) return;
      use.loader = use.loader.replace(
        "mini-css-extract-plugin/dist/loader.js",
        "style-loader/dist/cjs.js"
      );
    });
  });
};

const disableSVGExtraction = (webpackConfig) => {
  const svgTest = /\.svg$/;

  const svgLoader = JSON.parse(
    JSON.stringify(webpackConfig.module.rules[1].oneOf[2])
  );

  svgLoader.test = svgTest;
  svgLoader.use = [
    {
      loader: svgLoader.loader,
      options: svgLoader.options,
    },
    {
      loader: "url-loader",
      options: {
        limit: undefined,
      },
    },
  ];

  delete svgLoader.loader;
  delete svgLoader.options;

  webpackConfig.module.rules[1].oneOf = [
    svgLoader,
    ...webpackConfig.module.rules[1].oneOf,
  ];
};
