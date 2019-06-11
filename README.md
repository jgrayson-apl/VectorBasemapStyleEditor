
#### Live Demo
- https://maps.esri.com/jg/VectorBasemapStyleEditor/ 

#### Vector Basemap Style Editor
Edit the styles of Esri Vector Basemaps via ArcGIS.com items
- Always make a backup copy of the ArcGIS.com item before using this app
- The user experience is focused on color replacement
- Edit style json directly by clicking on 'id' cell. Warning: use caution!

#### Deployment
- Copy your application to a web accessible location
- Create a new item in your Org to your version of this application
- Register the new application item and make note of the App ID
- In /config/default.js change the oauthappid to the above App ID

#### Version
- 0.1.4
    - JS API 3.23    


#### License

> Copyright 2017 Esri
>
> Licensed under the Apache License, Version 2.0 (the "License");
> you may not use this file except in compliance with the License.
> You may obtain a copy of the License at
>
>   http://www.apache.org/licenses/LICENSE-2.0
>
> Unless required by applicable law or agreed to in writing, software
> distributed under the License is distributed on an "AS IS" BASIS,
> WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
> See the License for the specific language governing permissions and
> limitations under the License.

### 关于SetStyle错误的问题
- https://developers.arcgis.com/javascript/3/jsapi/vectortilelayer-amd.html#setstyle

- Changes the style properties used to render the layers. It is the equivalent of changing the entire CSS style sheet for a web page. It takes either a style object or a url to a style resource. When loading a style, it is the developer's responsibility to make sure that any relative urls in the style resolve correctly.(要由开发者对url路径进行处理！！！）
