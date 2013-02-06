/**
 * @private
 */
Ext.define('Ext.cf.util.ServiceVersionHelper', {
    requires: ['Ext.cf.ServiceDefinitions', 'Ext.cf.util.Logger'],

    statics: {
        get: function(serviceName) {
            var version = Ext.cf.ServiceDefinitions[serviceName];
            if(!version) {
                // throw error
                var err = Ext.cf.util.ErrorHelper.get("SERVICE_VERSION_UNKNOWN", serviceName);
                Ext.cf.util.Logger.error("FATAL", err);
                throw err.code + " " + err.message;
            }

            return version;
        }
    }
});
