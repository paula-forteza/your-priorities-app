var async = require("async");
var request = require('request').defaults({ encoding: null });
var fs = require('fs');
var randomstring = require("randomstring");
var log = require('../utils/logger');
var toJson = require('../utils/to_json');

"use strict";

var Upload = require('s3-uploader');

module.exports = function(sequelize, DataTypes) {
  var Image = sequelize.define("Image", {
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    license: DataTypes.STRING,
    cc_url: DataTypes.STRING,
    original_url: DataTypes.STRING,
    photographer_name: DataTypes.STRING,
    formats: DataTypes.TEXT,
    original_filename: DataTypes.STRING,
    s3_bucket_name: DataTypes.STRING,
    ip_address: { type: DataTypes.STRING, allowNull: false },
    user_agent: { type: DataTypes.TEXT, allowNull: false },
    location: DataTypes.JSONB,
    deleted: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false }
  }, {

    underscored: true,

    tableName: 'images',

    defaultScope: {
      where: {
        deleted: false
      },
      order: [
        ['created_at', 'asc' ]
      ]
    },

    classMethods: {


      createFormatsFromVersions: function (versions) {
        var formats = [];
        versions.forEach(function(version) {
          var n = version.url.lastIndexOf(process.env.S3_BUCKET);
          var path = version.url.substring(n+process.env.S3_BUCKET.length, version.url.length);
          var newUrl = "https://"+process.env.S3_BUCKET+".s3.amazonaws.com"+path;
          formats.push(newUrl);
        });
        return formats;
      },

      getUploadClient: function (itemType) {
        var versions;

        if (itemType && itemType === 'user-profile') {
          versions = [
            {
              maxHeight: 200,
              maxWidth: 200,
              format: 'png',
              aspect: '1:1!h',
              suffix: '-small',
              quality: 99
            },
            {
              maxHeight: 50,
              maxWidth: 50,
              aspect: '1:1!h',
              format: 'png',
              suffix: '-tiny',
              quality: 99
            }
          ]
        } else if (itemType && itemType === 'domain-logo') {
            versions = [
              {
                maxWidth: 864,
                maxHeight: 486,
                format: 'png',
                suffix: '-retina',
                quality: 99
              },
              {
                maxWidth: 432,
                maxHeight: 243,
                format: 'png',
                suffix: '-medium',
                quality: 99
              }
            ]
        } else if (itemType && itemType === 'community-logo') {
          versions = [
            {
              maxWidth: 864,
              maxHeight: 486,
              format: 'png',
              suffix: '-retina',
              quality: 99
            },
            {
              maxWidth: 432,
              maxHeight: 243,
              format: 'png',
              suffix: '-medium',
              quality: 99
            }
          ]
        } else if (itemType && itemType === 'organization-logo') {
          versions = [
            {
              maxWidth: 1000,
              maxHeight: 1000,
              format: 'png',
              suffix: '-large',
              quality: 99
            },
            {
              maxWidth: 200,
              maxHeight: 200,
              format: 'png',
              suffix: '-medium',
              quality: 99
            },
            {
              maxWidth: 50,
              maxHeight: 50,
              format: 'png',
              suffix: '-small',
              quality: 99
            }
          ]
        } else if (itemType && itemType === 'group-logo') {
          versions = [
            {
              maxWidth: 864,
              maxHeight: 486,
              format: 'png',
              suffix: '-retina',
              quality: 99
            },
            {
              maxWidth: 432,
              maxHeight: 243,
              format: 'png',
              suffix: '-medium',
              quality: 99
            }
          ]
        } else if (itemType && itemType === 'post-header') {
          versions = [
            {
              maxWidth: 864,
              maxHeight: 486,
              format: 'png',
              suffix: '-retina',
              quality: 99
            },
            {
              maxWidth: 432,
              maxHeight: 243,
              format: 'png',
              suffix: '-medium',
              quality: 99
            }
          ]
        } else if (itemType && itemType === 'category-icon') {
          versions = [
            {
              maxWidth: 864,
              maxHeight: 486,
              format: 'png',
              suffix: '-retina',
              quality: 99
            },
            {
              maxWidth: 432,
              maxHeight: 243,
              format: 'png',
              suffix: '-medium',
              quality: 99
            }
          ]
        } else if (itemType && itemType.indexOf('-header') > -1) {
          versions = [
            {
              maxHeight: 300,
              format: 'png',
              suffix: '-large',
              quality: 99
            }
          ]
        } else if (itemType && itemType.indexOf('post-user-image') > -1) {
          versions = [
            {
              maxHeight: 2048,
              maxWidth: 1536,
              format: 'png',
              suffix: '-desktop-retina',
              quality: 99
            },
            {
              maxHeight: 720,
              maxWidth: 540,
              format: 'png',
              suffix: '-mobile-retina',
              quality: 99
            },
            {
              maxHeight: 120,
              maxWidth: 90,
              format: 'png',
              suffix: '-thumb',
              quality: 99
            }
          ]
        } else {
          versions = [
            {
              maxWidth: 945,
              format: 'jpg',
              suffix: '-16_9',
              aspect: '16:9!h',
              quality: 80
            },
            {
              maxHeight: 512,
              maxWidth: 512,
              format: 'jpg',
              suffix: '-box',
              quality: 80
            },
            {
              maxWidth: 945,
              format: 'jpg',
              suffix: '-header',
              quality: 80
            }
          ]
        }

        return new Upload(process.env.S3_BUCKET, {
          url: process.env.S3_URL || null,
          aws: {
            region: process.env.S3_REGION || 'us-east-1',
            acl: 'public-read'
          },

          cleanup: {
            versions: false,
            original: false
          },

          versions: versions
        });
      },

      associate: function(models) {
        Image.belongsTo(models.User);
        Image.belongsToMany(models.Post, { as: 'PostImages', through: 'PostImage' });
        Image.belongsToMany(models.Post, { as: 'PostHeaderImages', through: 'PostHeaderImage' });
        Image.belongsToMany(models.Post, { as: 'PostUserImages', through: 'PostUserImage' });
        Image.belongsToMany(models.Group, { through: 'GroupImage' });
        Image.belongsToMany(models.Community, { as: 'CommunityLogoImages', through: 'CommunityLogoImage' });
        Image.belongsToMany(models.Community, { as: 'CommunityHeaderImages', through: 'CommunityHeaderImage' });
        Image.belongsToMany(models.User, { as: 'UserProfileImages', through: 'UserProfileImage' });
        Image.belongsToMany(models.User, { as: 'UserHeaderImages', through: 'UserHeaderImage' });
        Image.belongsToMany(models.Category, { as: 'CategoryIconImages', through: 'CategoryIconImage' });
        Image.belongsToMany(models.Category, { as: 'CategoryHeaderImages', through: 'CategoryHeaderImage' });
        Image.belongsToMany(models.Group, { as: 'GroupLogoImages', through: 'GroupLogoImage' });
        Image.belongsToMany(models.Group, { as: 'GroupHeaderImages', through: 'GroupHeaderImage' });
        Image.belongsToMany(models.Domain, { as: 'DomainLogoImages', through: 'DomainLogoImage' });
        Image.belongsToMany(models.Domain, { as: 'DomainHeaderImages', through: 'DomainHeaderImage' });
      },

      downloadFacebookImagesForUser: function (user, done) {
        var facebookId = user.facebook_id;
        //var facebookId = 746850516;
        if (facebookId && !user.UserProfileImages || user.UserProfileImages.length===0) {
          request.get('https://graph.facebook.com/' + facebookId + '/picture', function (err, downloadResponse, body) {
            if (err) {
              return done(err);
            }
            var filepath = "uploads/fb_image_download"+randomstring.generate(10) + '.png';
            var originalFilename = "facebook_profile_"+facebookId+".png";
            fs.writeFile(filepath, body, function(err) {
              if (err) {
                log.error("Error when trying to write image", {err: error});
                return done(err);
              }
              var s3UploadClient = sequelize.models.Image.getUploadClient("user-profile");
              s3UploadClient.upload(filepath, {}, function(error, versions, meta) {
                if (error) {
                  done(error);
                } else {
                  var image = sequelize.models.Image.build({
                    user_id: user.id,
                    s3_bucket_name: process.env.S3_BUCKET,
                    original_filename: originalFilename,
                    formats: JSON.stringify(sequelize.models.Image.createFormatsFromVersions(versions)),
                    user_agent: "Downloaded from Facebook",
                    ip_address: "127.0.0.1"
                  });
                  image.save().then(function() {
                    log.info('Image Created', { image: toJson(image), context: 'create', user: toJson(user) });
                    user.setupImages({uploadedProfileImageId: image.id}, function (error) {
                      fs.unlink(filepath, function(error) {
                        if (error) {
                          log.error("Error in unlinking image file: "+filepath);
                          return done(error);
                        } else {
                          setTimeout(function () {
                            sequelize.models.User.getUserWithAll(user.id, function (error, newUser) {
                              done(null, newUser);
                            });
                          },10);
                        }
                      });
                    });
                  }).catch(function(error) {
                    done(error);
                  });
                }
              });
            });
          });
        } else {
          log.info("User already has an image", {user: user, facebook_id: user ? user.facebook_id : null});
          done()
        }
      }
    }
  });

  return Image;
};
